from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)

from .views.order_views import OrderAPIList, OrderAPIUpdate
from .views.operation_views import (
    OperationAPIList, 
    OperationAPIUpdate,
    OperationAPIGetLast,
    OperationAPIGetByOrder,
    OperationAPISetCompleted,
    OperationAPIGetFirst
)
from .views.workshop_views import AssemblyShopAPIList, AssemblyShopAPIUpdate
from .views.executor_views import ExecutorAPIList, ExecutorAPIUpdate, ExecutorAPIListByWorkshop
from .views.user_views import MasterListAPIView, CurrentUserView

urlpatterns = [
    # Auth
    path('auth/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/users/me/', CurrentUserView.as_view()),

    # Orders (Множественное число)
    path('orders/', OrderAPIList.as_view()),
    path('orders/<int:pk>/', OrderAPIUpdate.as_view()),

    # Operations (Множественное число)
    path('operations/', OperationAPIList.as_view()),
    path('operations/<int:pk>/', OperationAPIUpdate.as_view()),
    
    # Custom Operation Actions
    path('operations/last-in-shop/<int:assembly_shop_pk>/', OperationAPIGetLast.as_view()),
    path('operations/by-order/<int:order_pk>/', OperationAPIGetByOrder.as_view()),
    path('operations/complete/<int:pk>/', OperationAPISetCompleted.as_view()),
    
    # Исправлено: привели к единому виду get-first (как на фронте) или first. 
    # Давайте использовать 'first', но поправим фронт под это.
    path('operations/first/', OperationAPIGetFirst.as_view()),
    
    # Workshops
    path('workshops/', AssemblyShopAPIList.as_view()),
    path('workshops/<int:pk>/', AssemblyShopAPIUpdate.as_view()),
    
    # Executors
    path('executors/', ExecutorAPIList.as_view()),
    path('executors/<int:pk>/', ExecutorAPIUpdate.as_view()),
    path('executors/by-workshop/<int:workshop_pk>/', ExecutorAPIListByWorkshop.as_view()),
    
    # Пользователи / Мастера
    path('masters/', MasterListAPIView.as_view()),
]