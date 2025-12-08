from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from api.models import AssemblyShop
from api.serializers import AssemblyShopSerializer
# Create your views here.

class AssemblyShopAPIList(generics.ListCreateAPIView):
    queryset = AssemblyShop.objects.all()
    serializer_class = AssemblyShopSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
class AssemblyShopAPIUpdate(generics.RetrieveUpdateDestroyAPIView):
    queryset = AssemblyShop.objects.all()
    serializer_class = AssemblyShopSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]