from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from api.models import TehLog
from api.serializers import TehLogSerializer
from api.permissions import IsTechnologistOrAdmin

class TehLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для просмотра логов (только чтение).
    Доступно только Технологам и Админам.
    """
    queryset = TehLog.objects.all().order_by('-logged_at')
    serializer_class = TehLogSerializer
    permission_classes = [IsAuthenticated, IsTechnologistOrAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['info', 'master__username', 'master__first_name', 'master__last_name', 'operation__name', 'operation__order__name']