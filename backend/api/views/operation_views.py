from rest_framework import generics
from ..models import Operation
from ..serializers import OperationSerializer
# Create your views here.

class OperationAPIList(generics.ListCreateAPIView):
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer
    
class OperationAPIUpdate(generics.RetrieveUpdateDestroyAPIView):
    queryset = Operation.objects.all()
    serializer_class = OperationSerializer