# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.

import ldap
from apps.setting.models import Setting
import json


class LDAP:
    def __init__(self):
        server_info = Setting.objects.exclude(key__in=('public_key', 'private_key')) \
            .filter(key='ldap_service').first()
        ldap_info_dict = json.loads(server_info.value)
        self.server = ldap_info_dict['server']
        self.port = ldap_info_dict['port']
        self.rules = ldap_info_dict['rules']
        self.admin_dn = ldap_info_dict['admin_dn']
        self.password = ldap_info_dict['password']
        self.base_dn = ldap_info_dict['base_dn']
        self.con = ldap.initialize("ldap://{0}:{1}".format(self.server, self.port), bytes_mode=False)
        try:
            self.con.simple_bind_s(self.admin_dn, self.password)
        except Exception as error:
            self.error = error

    def get_user_info(self, username):
        try:
            search_scope = ldap.SCOPE_SUBTREE
            search_filter_name = self.rules
            retrieve_attributes = None
            search_filter = '(' + search_filter_name + "=" + username + ')'
            ldap_result_id = self.con.search(self.base_dn, search_scope, search_filter, retrieve_attributes)
            result_type, result_data = self.con.result(ldap_result_id, 0)
            if result_type == ldap.RES_SEARCH_ENTRY:
                return {'status': True, 'info': result_data[0][0]}
            else:
                return {'status': False, 'info': 'LDAP用户未找到'}
        except Exception as error:
            error = eval(str(error))
            return {'status': False, 'info': error['desc']}

    def valid_user(self, username, password):
        user = self.get_user_info(username)
        if user['status']:
            try:
                self.con.simple_bind_s(user['info'], password)
                return {'status': True, 'info': ''}
            except Exception as error:
                error = eval(str(error))
                return {'status': False, 'info': error['desc']}
        else:
            return {'status': False, 'info': user['info']}

