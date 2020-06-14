# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from apps.setting.models import Setting
import ldap
import json


class LDAP:
    def __init__(self):
        server_info = Setting.objects.filter(key='ldap_service').first()
        ldap_info_dict = json.loads(server_info.value)
        self.server = ldap_info_dict['server']
        self.port = ldap_info_dict['port']
        self.rules = ldap_info_dict['rules']
        self.admin_dn = ldap_info_dict['admin_dn']
        self.password = ldap_info_dict['password']
        self.base_dn = ldap_info_dict['base_dn']

    def valid_user(self, username, password):
        try:
            conn = ldap.initialize("ldap://{0}:{1}".format(self.server, self.port), bytes_mode=False)
            conn.simple_bind_s(self.admin_dn, self.password)
            search_filter = f'({self.rules}={username})'
            ldap_result_id = conn.search(self.base_dn, ldap.SCOPE_SUBTREE, search_filter, None)
            result_type, result_data = conn.result(ldap_result_id, 0)
            if result_type == ldap.RES_SEARCH_ENTRY:
                conn.simple_bind_s(result_data[0][0], password)
                return True, None
            else:
                return False, None
        except Exception as error:
            args = error.args
            return False, args[0].get('desc', '未知错误') if args else '%s' % error
