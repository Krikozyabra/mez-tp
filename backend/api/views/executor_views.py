from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django.db.models import Prefetch, Count, Q
from api.models import Executor, Operation
from api.serializers import ExecutorSerializer, ExecutorAggregationSerializer 
# Create your views here.

class ExecutorAPIList(generics.ListCreateAPIView):
    queryset = Executor.objects.all()
    serializer_class = ExecutorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
class ExecutorAPIUpdate(generics.RetrieveUpdateDestroyAPIView):
    queryset = Executor.objects.all()
    serializer_class = ExecutorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
class ExecutorAPIListByWorkshop(APIView):
    def get(self, request, *args, **kwargs):
        workshop_pk = self.kwargs.get('workshop_pk')
        executors = Executor.objects\
            .filter(assembly_shops=workshop_pk)\
            .distinct()
        if not executors.exists():
            return Response(status=404, data={"detail":"No executors in workshop or workshop_pk is invalid"})
        serializer  = ExecutorSerializer(executors, many=True)
        return Response(status=200, data=serializer .data)
    
class ExecutorTasksAggregationView(generics.ListAPIView):
    """
    Возвращает список исполнителей со списком их задач.
    Поддерживает фильтр ?active_only=true (по умолчанию false, если не передано).
    """
    serializer_class = ExecutorAggregationSerializer

    def get_queryset(self):
        # Получаем параметры запроса
        active_only = self.request.query_params.get('active_only', 'false').lower() == 'true'
        
        # Базовый QuerySet задач, которые мы хотим "подтянуть" к исполнителям
        operations_qs = Operation.objects.select_related('order').all()
        
        if active_only:
            # Если нужны только активные (не завершенные)
            operations_qs = operations_qs.filter(actual_end__isnull=True)

        # Формируем основной запрос к Исполнителям
        queryset = Executor.objects.all().prefetch_related(
            # Важнейшая часть: подгружаем связанные задачи, используя фильтрованный QuerySet
            Prefetch('operation_set', queryset=operations_qs)
        ).annotate(
            # Считаем общее кол-во задач
            total_tasks=Count('operation_set'),
            # Считаем кол-во активных задач (где actual_end is NULL)
            active_tasks_count=Count('operation_set', filter=Q(operation_set__actual_end__isnull=True))
        )
        
        # Опционально: можно фильтровать самих исполнителей, у которых 0 задач,
        # если добавить .filter(total_tasks__gt=0)
        
        return queryset.order_by('full_name')