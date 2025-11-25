from rest_framework import serializers
from .models import Order, Operation

class OrderSerializer(serializers.ModelSerializer):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    class Meta:
        model = Order
        fields = '__all__'

class OperationSerializer(serializers.ModelSerializer):
    actual_start = serializers.ReadOnlyField()
    actual_end = serializers.ReadOnlyField()
    actual_planned_end = serializers.ReadOnlyField()
    class Meta:
        model = Operation
        fields = '__all__'

class LastOperationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operation
        fields = ['pk', 'priority', 'actual_planned_end']