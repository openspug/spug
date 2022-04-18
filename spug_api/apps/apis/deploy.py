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
    repo, body = _parse_request(request)
    if not repo:
        return HttpResponseForbidden()

    try:
        _, _kind, ref = body['ref'].split('/', 2)
        if kind == 'branch' and _kind == 'heads':
            commit_id = body['after']
            if commit_id != '0000000000000000000000000000000000000000' and ref == request.GET.get('name'):
                message = _parse_message(body, repo)
                Thread(target=_dispatch, args=(deploy_id, ref, commit_id, message)).start()
                return HttpResponse(status=202)
        elif kind == 'tag' and _kind == 'tags':
            Thread(target=_dispatch, args=(deploy_id, ref)).start()
            return HttpResponse(status=202)
        return HttpResponse(status=204)
    except Exception as e:
        return HttpResponseBadRequest(e)


def _parse_request(request):
    api_key = AppSetting.get_default('api_key')
    token, repo, body = None, None, None
    token = request.headers.get('X-Gitlab-Token')
    if 'X-Gitlab-Token' in request.headers:
        token = request.headers['X-Gitlab-Token']
        repo = 'Gitlab'
    elif 'X-Gitee-Token' in request.headers:
        token = request.headers['X-Gitee-Token']
        repo = 'Gitee'
    elif 'X-Codeup-Token' in request.headers:
        token = request.headers['X-Codeup-Token']
        repo = 'Codeup'
    elif 'X-Gogs-Signature' in request.headers:
        token = request.headers['X-Gogs-Signature']
        repo = 'Gogs'
    elif 'X-Hub-Signature-256' in request.headers:
        token = request.headers['X-Hub-Signature-256'].replace('sha256=', '')
        repo = 'Github'
    elif 'X-Coding-Signature' in request.headers:
        token = request.headers['X-Coding-Signature'].replace('sha1=', '')
        repo = 'Coding'
    elif 'token' in request.GET:  # Compatible the old version of gitlab
        token = request.GET.get('token')
        repo = 'Gitlab'

    if repo in ['Gitlab', 'Gitee', 'Codeup']:
        if token != api_key:
            return None, None
    elif repo in ['Github', 'Gogs']:
        en_api_key = hmac.new(api_key.encode(), request.body, hashlib.sha256).hexdigest()
        if token != en_api_key:
            return None, None
    elif repo in ['Coding']:
        en_api_key = hmac.new(api_key.encode(), request.body, hashlib.sha1).hexdigest()
        if token != en_api_key:
            return None, None
    else:
        return None, None

    body = json.loads(request.body)
    if repo == 'Gogs' and not body['ref'].startswith('refs/'):
        body['ref'] = 'refs/tags/' + body['ref']

    return repo, body


def _parse_message(body, repo):
    message = None
    if repo in ['Gitee', 'Github', 'Coding']:
        message = body.get('head_commit', {}).get('message', '')
    elif repo in ['Gitlab', 'Codeup', 'Gogs']:
        if body.get('commits'):
            message = body['commits'][0].get('message', '')
    else:
        raise ValueError(f'repo {repo} is not supported')
    return message[:20].strip()


def _dispatch(deploy_id, ref, commit_id=None, message=None):
    deploy = Deploy.objects.filter(pk=deploy_id).first()
    if not deploy:
        raise Exception(f'no such deploy id for {deploy_id}')

    req = DeployRequest(
        type='3',
        status='0' if deploy.is_audit else '2',
        deploy=deploy,
        spug_version=Repository.make_spug_version(deploy.id),
        host_ids=deploy.host_ids,
        created_by=deploy.created_by
    )

    if commit_id:  # branch
        req.version = f'{ref}#{commit_id[:6]}'
        req.name = message or req.version
        if deploy.extend == '1':
            req.extra = json.dumps(['branch', ref, commit_id])
    else:  # tag
        req.version = ref
        req.name = ref
        if deploy.extend == '1':
            req.extra = json.dumps(['tag', ref, None])

    req.save()
    if req.status == '2':
        deploy_dispatch(req)
