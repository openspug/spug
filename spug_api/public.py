from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import config
from flask_simpleldap import LDAP

app = Flask(__name__)
app.config.from_object(config)

app.config['LDAP_BASE_DN'] = app.config['LDAP_CONFIG'].get('base_dn')
app.config['LDAP_USERNAME'] = app.config['LDAP_CONFIG'].get('admin_dn')
app.config['LDAP_PASSWORD'] = app.config['LDAP_CONFIG'].get('admin_password')
app.config['LDAP_OPENLDAP'] = app.config['LDAP_CONFIG'].get('is_openldap')
app.config['LDAP_USER_OBJECT_FILTER'] = '(&(objectclass=inetOrgPerson)({0}=%s))'\
    .format(app.config['LDAP_CONFIG'].get('user_filter'))
app.config['LDAP_HOST'] = app.config['LDAP_CONFIG'].get('host')
app.config['LDAP_PORT'] = app.config['LDAP_CONFIG'].get('port')


db = SQLAlchemy(app)
ldap = LDAP(app)
