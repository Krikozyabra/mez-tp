from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from api.models import Operation
from api.serializers import (
    OperationSerializer,
    LastOperationSerializer,
    FirstOperationSerializer
)


class OperationAPIList(generics.ListCreateAPIView):
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class OperationAPIUpdate(generics.RetrieveUpdateDestroyAPIView):
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class OperationAPIGetLast(views.APIView):
    """
    Получение последней операции в цехе по actual_planned_end.
    """
    def get(self, request, assembly_shop_pk):
        operation = Operation.objects\
            .filter(assembly_shop=assembly_shop_pk)\
            .order_by('actual_planned_end')\
            .last()
            
        if not operation:
            return Response(
                {"detail": "Operations not found in this shop."}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        serialized = LastOperationSerializer(operation)
        return Response(serialized.data)


class OperationAPIGetFirst(views.APIView):
    """
    Получение самой первой операции (по дате старта).
    """
    def get(self, request):
        # order_by('field').first() читаемее, чем order_by('-field').last()
        operation = Operation.objects.order_by('actual_planned_start').first()
        
        if not operation:
            return Response(
                {"detail": "No operations found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        serialized = FirstOperationSerializer(operation)
        return Response(serialized.data)


class OperationAPIGetByOrder(generics.ListAPIView):
    """
    Получение всех операций по ID заказа.
    Используем generics.ListAPIView для поддержки пагинации и стандартного поведения.
    """
    serializer_class = OperationSerializer

    def get_queryset(self):
        order_pk = self.kwargs.get('order_pk')
        return Operation.objects.filter(order_id=order_pk)


class OperationAPISetCompleted(views.APIView):
    """
    Завершение операции и пересчет графика последующих операций.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def put(self, request, pk):
        prev_operation = get_object_or_404(Operation, pk=pk)
        
        # Используем транзакцию, чтобы обновление было атомарным (все или ничего)
        with transaction.atomic():
            # 1. Завершаем текущую
            now = timezone.now()
            prev_operation.completed = True
            prev_operation.actual_end = now
            prev_operation.save()
            
            # 2. Ищем следующие операции
            next_operations = Operation.objects.filter(
                assembly_shop=prev_operation.assembly_shop,
                priority__gt=prev_operation.priority
            ).order_by("priority")
            
            if not next_operations.exists():
                return Response({"id": pk, "message": "Operation completed. No next operations updated."}, status=status.HTTP_200_OK)

            # Переменная для цепочки времени
            last_finish_time = prev_operation.actual_end
            operations_to_update = []
            
            for index, op in enumerate(next_operations):
                # Уменьшаем приоритет
                op.priority -= 1
                
                # Если это первая операция в очереди (она должна начаться сейчас)
                if index == 0:
                    op.actual_start = last_finish_time
                    op.actual_planned_start = last_finish_time
                else:
                    # Остальные просто сдвигаются в плане
                    op.actual_planned_start = last_finish_time
                
                # Вычисляем новый конец.
                # Важно: duration_minutes() должен возвращать число (int/float)
                duration = timedelta(minutes=op.duration_minutes())
                op.actual_planned_end = op.actual_planned_start + duration
                
                # Обновляем время для следующего шага цикла
                last_finish_time = op.actual_planned_end
                
                operations_to_update.append(op)

            # Массовое обновление
            Operation.objects.bulk_update(operations_to_update, [
                'priority', 
                'actual_start', 
                'actual_planned_start', 
                'actual_planned_end'
            ])
        
        return Response({"id": pk, "updated_count": len(operations_to_update)}, status=status.HTTP_200_OK)