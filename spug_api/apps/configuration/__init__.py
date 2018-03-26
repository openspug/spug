from apps.configuration import environment
from apps.configuration import service
from apps.configuration import config
from apps.configuration import app as app_page
from apps.configuration import relationship


def register_blueprint(app):
    app.register_blueprint(environment.blueprint, url_prefix='/configuration/environments')
    app.register_blueprint(service.blueprint, url_prefix='/configuration/services')
    app.register_blueprint(config.blueprint, url_prefix='/configuration/configs')
    app.register_blueprint(app_page.blueprint, url_prefix='/configuration/apps')
    app.register_blueprint(relationship.blueprint, url_prefix='/configuration/relationship')
