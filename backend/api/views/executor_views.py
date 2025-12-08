from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from api.models import Executor
from api.serializers import ExecutorSerializer
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