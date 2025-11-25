from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
from .views.order_views import *
from .views.operation_views import *

urlpatterns = [
    path('order/', OrderAPIList.as_view()),
    path('order/<int:pk>/', OrderAPIUpdate.as_view()),

    path('operation/', OperationAPIList.as_view()),
    path('operation/<int:pk>/', OperationAPIUpdate.as_view()),
    path('operation/last_in_shop/<int:assembly_shop_pk>/', OperationAPIGetLast.as_view()),

    path('auth/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh')
]