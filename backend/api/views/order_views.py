from django.db import transaction
from rest_framework import generics, permissions
from api.models import Order
from api.serializers import OrderSerializer
from api.permissions import IsTechnologistOrAdmin

from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class OrderListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: Список заказов (доступно всем авторизованным).
    POST: Создание заказа (только Технолог/Админ).
    """
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTechnologistOrAdmin()]
        return [permissions.AllowAny()]
    
class OrderDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Получить заказ (всем).
    PUT/PATCH: Обновить заказ (Технолог/Админ).
    DELETE: Удалить заказ (Технолог/Админ).
    """
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsTechnologistOrAdmin()]
        return [permissions.AllowAny()]

    def perform_update(self, serializer):
        # Логика: Если default_master меняется, обновляем master во всех операциях заказа
        with transaction.atomic():
            # Запоминаем старого мастера до сохранения
            instance = serializer.instance
            old_master = instance.default_master
            
            # Сохраняем изменения в заказе
            updated_instance = serializer.save()
            new_master = updated_instance.default_master
            
            # Если мастер изменился (неважно, на другого или на пустоту)
            if old_master != new_master:
                # Обновляем всех наследников
                updated_instance.operations.update(master=new_master)