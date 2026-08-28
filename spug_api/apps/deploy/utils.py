# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django_redis import get_redis_connection
from django.conf import settings
from django.db import close_old_connections
from libs.utils import AttrDict
from apps.config.utils import compose_configs
from apps.deploy.models import DeployRequest
from apps.deploy.helper import Helper, SpugError
from apps.deploy.ext1 import ext1_deploy
from apps.deploy.ext2 import ext2_deploy
import json
import uuid

REPOS_DIR = settings.REPOS_DIR


def dispatch_all(req):
    """Dispatch a deploy request for all its hosts, used by planned/webhook triggered deploys."""
    host_ids = json.loads(req.host_ids)
    with_local = False
    if req.deploy.extend == '1':
        if not req.repository_id:
            with_local = True
    else:
        if json.loads(req.deploy.extend_obj.server_actions):
            with_local = True
    dispatch(req, host_ids, with_local)


def dispatch(req, deploy_host_ids, with_local, language='zh'):
    rds = get_redis_connection()
    rds_key = req.deploy_key
    keys = deploy_host_ids + ['local'] if with_local else deploy_host_ids
    helper = Helper.make(rds, rds_key, keys, language)

    try:
        api_token = uuid.uuid4().hex
        rds.setex(api_token, 60 * 60, f'{req.deploy.app_id},{req.deploy.env_id}')
        env = AttrDict(
            SPUG_APP_NAME=req.deploy.app.name,
            SPUG_APP_KEY=req.deploy.app.key,
            SPUG_APP_ID=str(req.deploy.app_id),
            SPUG_REQUEST_ID=str(req.id),
            SPUG_REQUEST_NAME=req.name,
            SPUG_DEPLOY_ID=str(req.deploy.id),
            SPUG_ENV_ID=str(req.deploy.env_id),
            SPUG_ENV_KEY=req.deploy.env.key,
            SPUG_VERSION=req.version,
            SPUG_BUILD_VERSION=req.spug_version,
            SPUG_DEPLOY_TYPE=req.type,
            SPUG_API_TOKEN=api_token,
            SPUG_REPOS_DIR=REPOS_DIR,
        )
        # append configs
        configs = compose_configs(req.deploy.app, req.deploy.env_id)
        configs_env = {f'_SPUG_{k.upper()}': v for k, v in configs.items()}
        env.update(configs_env)

        if req.deploy.extend == '1':
            ext1_deploy(req, helper, env)
        else:
            ext2_deploy(req, helper, env, with_local)
        req.status = '3'
    except Exception as e:
        req.status = '-3'
        if not isinstance(e, SpugError):
            raise e
    finally:
        close_old_connections()
        request = DeployRequest.objects.get(pk=req.id)
        deploy_status = json.loads(request.deploy_status)
        deploy_status.update({str(k): v for k, v in helper.deploy_status.items()})
        values = [v for k, v in deploy_status.items() if k != 'local']
        if not values:  # no host-side actions, decide by the local task
            request.status = '3' if deploy_status.get('local') == '2' else '-3'
        elif all([x == '2' for x in values]):
            if len(values) == len(json.loads(request.host_ids)):
                request.status = '3'
            else:
                request.status = '4'
        else:
            request.status = '-3'
        request.repository = req.repository
        request.deploy_status = json.dumps(deploy_status)
        request.save()
        req.status = request.status
        helper.clear()
        Helper.send_deploy_notify(req)
