from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models import Order, Operation, AssemblyShop, Executor, TehLog
from .utils import sort_operations_chain 

User = get_user_model()

class OperationSerializer(serializers.ModelSerializer):
    predict_start = serializers.ReadOnlyField()
    predict_end = serializers.ReadOnlyField()
    actual_start = serializers.ReadOnlyField()
    actual_end = serializers.ReadOnlyField()
    duration_minutes = serializers.SerializerMethodField()

    assembly_shop_name = serializers.CharField(source='assembly_shop.name', read_only=True)
    master_name = serializers.CharField(source='master.username', read_only=True)

    status = serializers.ReadOnlyField()

    class Meta:
        model = Operation
        fields = [
            'id',
            'order',
            'name',
            'description',

            'status',

            'assembly_shop',
            'assembly_shop_name',

            'executors',

            'master',
            'master_name',

            'previous_operation',

            'planned_start',
            'planned_end',

            'predict_start',
            'predict_end',

            'actual_start',
            'actual_end',

            'duration_minutes',
        ]

    def get_duration_minutes(self, obj):
        return int(obj.duration.total_seconds() / 60)
        
class OperationStartSerializer(serializers.Serializer):
    assembly_shop_id = serializers.IntegerField(required=True)
    executor_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        required=True
    )

class TehLogSerializer(serializers.ModelSerializer):
    master_name = serializers.CharField(source='master.username', read_only=True)
    operation_name = serializers.CharField(source='operation.name', read_only=True)
    
    class Meta:
        model = TehLog
        fields = ['id', 'logged_at', 'master', 'master_name', 'info', 'type', 'operation', 'operation_name']

# Сериализатор для списка мастеров
class MasterSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'role']

    def get_full_name(self, obj):
        return f"{obj.last_name} {obj.first_name}".strip() or obj.username

class OrderSerializer(serializers.ModelSerializer):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    operations = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'name', 'description', 
            'default_master', 'deadline', 
            'created_at', 'operations',
            'created_by'
        ]

    def get_operations(self, obj):
        # Получаем операции текущего заказа
        ops = obj.operations.all()
        # Сортируем их нашей функцией
        sorted_ops = sort_operations_chain(ops)
        
        return OperationSerializer(sorted_ops, many=True, context=self.context).data


class LastOperationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operation
        fields = ['pk', 'predict_end']

class FirstOperationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operation
        fields = ['pk', 'planned_start']
        
class AssemblyShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssemblyShop
        fields = '__all__'
        
class ExecutorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Executor
        fields = '__all__'