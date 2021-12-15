# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.http.response import HttpResponseBadRequest, HttpResponseForbidden, HttpResponse
from apps.setting.utils import AppSetting
from apps.deploy.models import Deploy, DeployRequest
from apps.repository.models import Repository
from apps.deploy.utils import dispatch as deploy_dispatch
from threading import Thread
import hashlib
import hmac
import json


def auto_deploy(request, deploy_id, kind):
    if not _is_valid_token(request):
        return HttpResponseForbidden()
    try:
        body = json.loads(request.body)
        if not body['ref'].startswith('refs/'):  # Compatible with gogs
            body['ref'] = 'refs/tags/' + body['ref']

        _, _kind, ref = body['ref'].split('/', 2)
        if kind == 'branch' and _kind == 'heads':
            commit_id = body['after']
            if commit_id != '0000000000000000000000000000000000000000' and ref == request.GET.get('name'):
                Thread(target=_dispatch, args=(deploy_id, ref, commit_id)).start()
                return HttpResponse(status=202)
        elif kind == 'tag' and _kind == 'tags':
            Thread(target=_dispatch, args=(deploy_id, ref)).start()
            return HttpResponse(status=202)
        return HttpResponse(status=204)
    except Exception as e:
        return HttpResponseBadRequest(e)


def _is_valid_token(request):
    api_key = AppSetting.get_default('api_key')

    # Gitlab Gitee Aliyun(Codeup)
    token = request.headers.get('X-Gitlab-Token')
    token = token or request.headers.get('X-Gitee-Token')
    token = token or request.headers.get('X-Codeup-Token')
    # Compatible the old version of gitlab
    token = token or request.GET.get('token')
    if token:
        return token == api_key

    # Gogs Github
    token = request.headers.get('X-Gogs-Signature')
    token = token or request.headers.get('X-Hub-Signature-256', '').replace('sha256=', '')
    if token:
        return token == hmac.new(api_key.encode(), request.body, hashlib.sha256).hexdigest()
    return False


def _dispatch(deploy_id, ref, commit_id=None):
    deploy = Deploy.objects.filter(pk=deploy_id).first()
    if not deploy:
        raise Exception(f'no such deploy id for {deploy_id}')
    if deploy.extend == '1':
        _deploy_extend_1(deploy, ref, commit_id)
    else:
        _deploy_extend_2(deploy, ref, commit_id)


def _deploy_extend_1(deploy, ref, commit_id=None):
    if commit_id:
        extra = ['branch', ref, commit_id]
        version = f'{ref}#{commit_id[:6]}'
    else:
        extra = ['tag', ref, None]
        version = ref

    req = DeployRequest.objects.create(
        type='3',
        status='0' if deploy.is_audit else '2',
        deploy=deploy,
        name=version,
        extra=json.dumps(extra),
        version=version,
        spug_version=Repository.make_spug_version(deploy.id),
        host_ids=deploy.host_ids,
        created_by=deploy.created_by
    )
    if req.status == '2':
        deploy_dispatch(req)


def _deploy_extend_2(deploy, ref, commit_id=None):
    version = f'{ref}#{commit_id[:6]}' if commit_id else ref
    req = DeployRequest.objects.create(
        type='3',
        status='0' if deploy.is_audit else '2',
        deploy=deploy,
        name=version,
        version=version,
        spug_version=Repository.make_spug_version(deploy.id),
        host_ids=deploy.host_ids,
        created_by=deploy.created_by
    )
    if req.status == '2':
        deploy_dispatch(req)
