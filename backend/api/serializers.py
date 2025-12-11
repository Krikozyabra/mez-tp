from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Order, Operation, AssemblyShop, Executor

User = get_user_model()

class OperationSerializer(serializers.ModelSerializer):
    actual_start = serializers.ReadOnlyField()
    actual_end = serializers.ReadOnlyField()
    actual_planned_end = serializers.ReadOnlyField()
    actual_planned_start = serializers.ReadOnlyField()
    assembly_shop_name = serializers.CharField(source='assembly_shop.name', read_only=True)
    
    class Meta:
        model = Operation
        fields = '__all__'
        
class OperationCompleteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operation
        fields = ['completed',]

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
    operations = OperationSerializer(many=True, read_only=True)
    class Meta:
        model = Order
        fields = '__all__'

class LastOperationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operation
        fields = ['pk', 'priority', 'actual_planned_end']

class FirstOperationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operation
        fields = ['pk', 'priority', 'actual_planned_start']
        
class AssemblyShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssemblyShop
        fields = '__all__'
        
class ExecutorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Executor
        fields = '__all__'