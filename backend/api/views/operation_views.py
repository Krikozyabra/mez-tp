from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from ..models import Operation
from ..serializers import (
    OperationSerializer, 
    LastOperationSerializer)
# Create your views here.

class OperationAPIList(generics.ListCreateAPIView):
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
class OperationAPIUpdate(generics.RetrieveUpdateDestroyAPIView):
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class OperationAPIGetLast(APIView):
    def get(self, request, *args, **kwargs):
        assembly_shop_pk = self.kwargs.get("assembly_shop_pk")
        operation = Operation.objects\
            .filter(assembly_shop=assembly_shop_pk)\
            .order_by('-pk')\
            .last()
        if operation is None:
            return Response(status=404, data={"detail":"No operations in assembly shop or assembly shop primary key is invalid"})
        serialized = LastOperationSerializer(operation)
        json = JSONRenderer().render(serialized.data)
        return Response(status=200, data=json)
    
class OperationAPIGetByOrder(APIView):
    def get(self, request, *args, **kwargs):
        order_pk = self.kwargs.get('order_pk')
        operations_list = Operation.objects\
            .filter(order_id=order_pk)\
            .all()
        if operations_list is None:
            return Response(status=404, data={"detail":"No operations in order or order_pk is invalid"})
        serialized = OperationSerializer(operations_list, many=True)
        json = JSONRenderer().render(serialized.data)
        return Response(status=200, data=json)
