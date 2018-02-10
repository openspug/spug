from apps.home import homes


def register_blueprint(app):
    app.register_blueprint(homes.blueprint, url_prefix='/home')
