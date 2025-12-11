from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from api.serializers import MasterSerializer

User = get_user_model()

class MasterListAPIView(generics.ListAPIView):
    serializer_class = MasterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Возвращаем пользователей с ролью 'master'
        return User.objects.filter(role='master')
    
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MasterSerializer(request.user) # MasterSerializer содержит поле role?
        # Если нет, используйте UserSerializer из djoser или кастомный, где есть поле 'role'
        return Response(serializer.data)