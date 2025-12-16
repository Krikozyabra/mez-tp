from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from api.models import Operation, AssemblyShop, Executor
from api.serializers import OperationSerializer, OperationStartSerializer
from api.permissions import IsTechnologistOrAdmin, IsMasterOrTechnologist

from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

def recalculate_chain(start_operation, is_ended = True):
    """
    Рекурсивно (или итеративно) обновляет predict_start/end для зависимых операций.
    """
    current_op = start_operation
    # Чтобы избежать бесконечных циклов, можно использовать set для visited
    visited = set()

    while current_op.next_operation:
        next_op = current_op.next_operation
        
        if next_op.id in visited:
            break
        visited.add(next_op.id)
        
        # New Predict Start = Previous Predict End
        next_op.predict_start = current_op.actual_end if is_ended else current_op.predict_end
        # New Predict End = Start + Duration
        next_op.predict_end = next_op.predict_start + next_op.duration
        
        next_op.save(update_fields=['predict_start', 'predict_end'])
        
        current_op = next_op

class OperationListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: Список операций (доступно всем).
    POST: Создание операции (только Технолог/Админ).
    """
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTechnologistOrAdmin()]
        return [permissions.AllowAny()]
    
class OperationDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Получить операцию.
    PUT/PATCH: Изменить параметры.
    - Технолог/Админ: все поля.
    - Мастер: только исполнители и цех (и только если он привязан).
    DELETE: Удалить (только Технолог/Админ).
    """
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer
    
    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsTechnologistOrAdmin()]

        # Для PUT/PATCH проверка внутри метода, так как зависит от прав мастера
        if self.request.method in ['PUT', 'PATCH']:
                return [permissions.IsAuthenticated()] 
        
        return [permissions.AllowAny()]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        role = getattr(user, 'role', None)

        # Если Технолог или Админ - разрешаем всё (стандартный update)
        if role in ['technolog', 'admin']:
            return super().update(request, *args, **kwargs)
        
        # Если Мастер
        if role == 'master':
            # Проверяем, привязан ли мастер к операции
            if instance.master != user:
                return Response(
                    {"detail": "Вы не являетесь мастером данной операции."}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Мастер может менять ТОЛЬКО assembly_shop и executors
            # Проверяем, не пытается ли он изменить что-то другое
            # allowed_fields = {'assembly_shop', 'executors'}
            # data_keys = set(request.data.keys())
            
            # Если переданы лишние поля (исключая executors, т.к. это m2m и может передаваться списком)
            # В DRF executors ожидается как список ID, assembly_shop как ID.
            
            # Упрощенная логика: используем partial update и игнорируем запрещенные поля,
            # либо выбрасываем ошибку. По требованиям: "изменить исполнителей и цех может мастер".
            # Сделаем жесткую фильтрацию данных для мастера.
            
            new_data = {}
            if 'assembly_shop' in request.data:
                new_data['assembly_shop'] = request.data['assembly_shop']
            if 'executors' in request.data:
                new_data['executors'] = request.data['executors']
                
            if not new_data:
                return Response(
                    {"detail": "Мастер может менять только цех и исполнителей."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = self.get_serializer(instance, data=new_data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)

        return Response(status=status.HTTP_403_FORBIDDEN)
    
class OperationStartAPIView(views.APIView):
    """
    PATCH .../operation/{id}/start
    Фиксирует цех, исполнителей, Actual Start. Пересчитывает цепочку.
    """
    permission_classes = [IsMasterOrTechnologist]
    
    def patch(self, request, pk):
        operation = get_object_or_404(Operation, pk=pk)
        
        if operation.actual_start:
            return Response(
                {"detail": "Operation already started"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверка прав мастера (если это мастер, а не технолог/админ)
        if request.user.role == 'master' and operation.master != request.user:
            return Response({"detail": "Not assigned master"}, status=status.HTTP_403_FORBIDDEN)

        serializer = OperationStartSerializer(data=request.data)
        if serializer.is_valid():
            shop_id = serializer.validated_data['assembly_shop_id']
            executors_ids = serializer.validated_data['executor_ids']
            
            if not executors_ids:
                return Response(
                    {"detail": "Executors list cannot be empty"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            shop = get_object_or_404(AssemblyShop, pk=shop_id)
            executors = Executor.objects.filter(pk__in=executors_ids)
            if len(executors) != len(executors_ids):
                return Response({"detail": "Some executors not found"}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                now = timezone.now()
                operation.assembly_shop = shop
                operation.actual_start = now
                operation.predict_end = now + operation.duration # duration based on planned diff
                operation.save()
                
                operation.executors.set(executors)
                # Recalculate chain
                if operation.next_operation:
                    recalculate_chain(operation, is_ended=False)
            
            return Response(OperationSerializer(operation).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class OperationEndAPIView(views.APIView):
    """
    PATCH .../operation/{id}/end
    Фиксирует Actual End.
    """
    permission_classes = [IsMasterOrTechnologist]
    
    def patch(self, request, pk):
        operation = get_object_or_404(Operation, pk=pk)
        
        if not operation.actual_start:
            return Response(
                {"detail": "Operation has not been started"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request.user.role == 'master' and operation.master != request.user:
            return Response({"detail": "Not assigned master"}, status=status.HTTP_403_FORBIDDEN)
        
        with transaction.atomic():
                now = timezone.now()
                operation.actual_end = now
                # operation.predict_end = now + operation.duration # duration based on planned diff
                operation.save()
                
                # Recalculate chain
                if operation.next_operation:
                    recalculate_chain(operation)
        
        return Response(OperationSerializer(operation).data)