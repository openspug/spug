# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
import ldap


class LDAP:
    def __init__(self, server, admin_dn, admin_password, user_ou, user_filter, map_username, map_nickname):
        self.server = server
        self.admin_dn = admin_dn
        self.admin_dn = admin_dn
        self.admin_password = admin_password
        self.user_ou = user_ou
        self.user_filter = user_filter
        self.map_username = map_username
        self.map_nickname = map_nickname


    def connect(self):
        try:
            conn = ldap.initialize(f'{self.server}', bytes_mode=False)
            conn.set_option(ldap.OPT_TIMEOUT, 3)
            conn.set_option(ldap.OPT_NETWORK_TIMEOUT, 3)
            conn.simple_bind_s(self.admin_dn, self.admin_password)
            return True, conn
        except Exception as error:
            return False, error.args[0].get('desc')

    
    def all_user(self):
        status, conn = self.connect()
        if status:
            try:
                # user_filter = '(cn=*)'
                # map = ['cn', 'sn']
                # user_map = list(self.user_map.values())
                user_filter = "({}=*)".format(self.user_filter.split('=')[0][1:])
                user_map = [self.map_username, self.map_nickname]
                ldap_result = conn.search_s(self.user_ou, ldap.SCOPE_SUBTREE, user_filter, user_map)
                ldap_users = []
                for dn,entry in ldap_result:
                    if dn == self.user_ou:
                        continue
                    tmp_user = {}
                    for k,v in entry.items():
                        tmp_user.update({k: v[0].decode()})
                    
                    ldap_users.append(tmp_user)
                return True, ldap_users

            except Exception as error:
                return False, error.args[0].get('desc')
        else:
            return False, conn

    def verify_user(self, username, password):
        status, conn = self.connect()
        if status:
            try:
                user_filter = f'({self.map_username}={username})'
                ldap_result_id = conn.search(self.user_ou, ldap.SCOPE_SUBTREE, user_filter, [self.map_username])
                _, result_data = conn.result(ldap_result_id, 0)
                if result_data:
                    conn.simple_bind_s(result_data[0][0], password)
                    return True, True
                else:
                    return False, '账户未找到'
            except Exception as error:
                return False, error.args[0].get('desc')
        else:
            return False, conn

