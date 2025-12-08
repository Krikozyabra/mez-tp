from rest_framework import permissions

class IsTechnologistOrAdmin(permissions.BasePermission):
    """
    Полный доступ только у технологов и админов.
    """
    def has_permission(self, request, view) -> bool:
        # Разрешаем всем безопасные методы (просмотр)
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Проверка:
        # 1. Пользователь залогинен (иначе это AnonymousUser, у которого нет поля role)
        # 2. У пользователя есть нужная роль
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['technolog', 'admin']
        )

class IsMasterOrTechnologist(permissions.BasePermission):
    """
    Права для действий мастера (контроль).
    """
    def has_permission(self, request, view) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['master', 'technolog', 'admin']
        )