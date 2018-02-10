from apps.apis import config
from apps.apis import files


def register_blueprint(app):
    app.register_blueprint(config.blueprint, url_prefix='/apis/configs')
    app.register_blueprint(files.blueprint, url_prefix='/apis/files')

