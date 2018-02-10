from apps.common import queue


def register_blueprint(app):
    app.register_blueprint(queue.blueprint, url_prefix='/common/queue')
