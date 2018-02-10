from apps.deploy import app as app_page
from apps.deploy import image
from apps.deploy import config
from apps.deploy import publish
from apps.deploy import host
from apps.deploy import container
from apps.deploy import menu
from apps.deploy import exec
from apps.deploy import field


def register_blueprint(app):
    app.register_blueprint(app_page.blueprint, url_prefix='/deploy/apps')
    app.register_blueprint(image.blueprint, url_prefix='/deploy/images')
    app.register_blueprint(config.blueprint, url_prefix='/deploy/configs')
    app.register_blueprint(publish.blueprint, url_prefix='/deploy/publish')
    app.register_blueprint(host.blueprint, url_prefix='/deploy/hosts')
    app.register_blueprint(container.blueprint, url_prefix='/deploy/containers')
    app.register_blueprint(menu.blueprint, url_prefix='/deploy/menus')
    app.register_blueprint(exec.blueprint, url_prefix='/deploy/exec')
    app.register_blueprint(field.blueprint, url_prefix='/deploy/fields')
