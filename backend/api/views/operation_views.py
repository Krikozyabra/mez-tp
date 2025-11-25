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
        serializer = LastOperationSerializer(operation)
        json = JSONRenderer().render(serializer.data)
        return Response(status=200, data=json)
