# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.urls import path

from apps.ai.views import (
    ModelView, SessionView, McpView, SkillView, test_model, test_mcp,
    session_chat, session_confirm, session_stream,
)

urlpatterns = [
    path('model/', ModelView.as_view()),
    path('model/test/', test_model),
    path('mcp/', McpView.as_view()),
    path('mcp/test/', test_mcp),
    path('skill/', SkillView.as_view()),
    path('session/', SessionView.as_view()),
    path('session/chat/', session_chat),
    path('session/confirm/', session_confirm),
    path('session/stream/', session_stream),
]
