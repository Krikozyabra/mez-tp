from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from api.models import Order
from api.serializers import OrderSerializer
# Create your views here.

class OrderAPIList(generics.ListCreateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
class OrderAPIUpdate(generics.RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]