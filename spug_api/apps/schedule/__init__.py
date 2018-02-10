def register_blueprint(app):
    from apps.schedule import job
    from apps.schedule import history

    app.register_blueprint(job.blueprint, url_prefix='/schedule/jobs')
    app.register_blueprint(history.blueprint, url_prefix='/schedule/histories')
