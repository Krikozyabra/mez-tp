from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from api.models import Operation, AssemblyShop, Executor, TehLog
from api.serializers import OperationSerializer, OperationStartSerializer
from api.permissions import IsTechnologistOrAdmin, IsMasterOrTechnologist
from api.utils import sort_operations_chain, recalculate_chain


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class OperationListCreateAPIView(generics.ListCreateAPIView):
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTechnologistOrAdmin()]
        return [permissions.AllowAny()]
    
class OperationDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsTechnologistOrAdmin()]
        if self.request.method in ['PUT', 'PATCH']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        role = getattr(user, 'role', None)

        # --- Technolog/Admin могут менять всё ---
        if role in ['technolog', 'admin']:
            return super().update(request, *args, **kwargs)

        # --- Master может менять только мастер/цех/исполнителей ---
        if role == 'master':
            if instance.master != user:
                return Response(
                    {"detail": "Вы не являетесь мастером данной операции."}, 
                    status=status.HTTP_403_FORBIDDEN
                )

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

    def perform_update(self, serializer):
        instance = serializer.save()
        
        if instance.next_operations.exists():
            recalculate_chain(instance)
    
class OperationAPIGetByOrder(generics.ListAPIView):
    serializer_class = OperationSerializer

    def get_queryset(self):
        order_pk = self.kwargs.get('order_pk')
        return Operation.objects.filter(order_id=order_pk)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        sorted_ops = sort_operations_chain(queryset)
        serializer = self.get_serializer(sorted_ops, many=True)
        return Response(serializer.data)

class OperationStartAPIView(views.APIView):
    permission_classes = [IsMasterOrTechnologist]
    
    def patch(self, request, pk):
        operation = get_object_or_404(Operation, pk=pk)
        
        if operation.actual_start:
            return Response(
                {"detail": "Operation already started"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
                
                # Обновляем прогнозы при старте
                operation.predict_start = now
                operation.predict_end = now + operation.duration
                operation.save()
                
                operation.executors.set(executors)
                
                # Исправлено: next_operations.exists() и убран is_ended
                if operation.next_operations.exists():
                    recalculate_chain(operation)
            
            if request.user.role == 'master':
                log = TehLog()
                log.master = operation.master
                log.operation = operation
                if operation.actual_start > operation.planned_start:
                    log.type = TehLog.LogType.LATE_START
                    diff = operation.actual_start - operation.planned_start
                    log.info = f"Операция '{operation.name}' в заказе '{operation.order.name}' была начата на {diff.days} день(я) {round(diff.seconds/60/60, 1)} часа(ов) позже плана мастером {operation.master.username}"
                else:
                    log.type = TehLog.LogType.AHEAD_START
                    diff = operation.planned_start - operation.actual_start
                    log.info = f"Операция '{operation.name}' в заказе '{operation.order.name}' была начата на {diff.days} день(я) {round(diff.seconds/60/60, 1)} часа(ов) раньше плана мастером {operation.master.username}"
                
                log.save()

            return Response(OperationSerializer(operation).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class OperationEndAPIView(views.APIView):
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
            operation.save()
            
            if operation.next_operations.exists():
                recalculate_chain(operation)
                
            if request.user.role == 'master':
                log = TehLog()
                log.master = operation.master
                log.operation = operation
                if operation.actual_end > operation.planned_end:
                    log.type = TehLog.LogType.LATE_STOP
                    diff = operation.actual_end - operation.planned_end
                    log.info = f"Операция '{operation.name}' в заказе '{operation.order.name}' была завершена на {diff.days} день(я) {round(diff.seconds/60/60, 1)} часа(ов) позже плана мастером {operation.master.username}"
                else:
                    log.type = TehLog.LogType.AHEAD_STOP
                    diff = operation.planned_end - operation.actual_end
                    log.info = f"Операция '{operation.name}' в заказе '{operation.order.name}' была завершена на {diff.days} день(я) {round(diff.seconds/60/60, 1)} часа(ов) раньше плана мастером {operation.master.username}"
                
                log.save()
        
        return Response(OperationSerializer(operation).data)