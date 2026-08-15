# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.db import connections
from django.conf import settings
from apps.account.models import History, User
from apps.alarm.models import Alarm
from apps.schedule.models import Task, History as TaskHistory
from apps.deploy.models import DeployRequest
from apps.app.models import DeployExtend1
from apps.exec.models import ExecHistory, Transfer
from apps.notify.models import Notify
from apps.deploy.utils import dispatch_all
from apps.repository.models import Repository
from libs.utils import parse_time, human_datetime, human_date
from datetime import datetime, timedelta
from threading import Thread
from collections import defaultdict
from pathlib import Path
import time
import os


def auto_run_by_day():
    try:
        date_7 = human_date(datetime.now() - timedelta(days=7))
        date_30 = human_date(datetime.now() - timedelta(days=30))
        History.objects.filter(created_at__lt=date_30).delete()
        Notify.objects.filter(created_at__lt=date_7, unread=False).delete()
        Alarm.objects.filter(created_at__lt=date_30).delete()
        for item in DeployExtend1.objects.all():
            try:
                reqs = list(DeployRequest.objects.filter(deploy_id=item.deploy_id, repository_id__isnull=False)
                            .select_related('repository'))
                keep_ids = {x.repository_id for x in reqs[:item.versions + 1]}
                handled = set()
                for req in reqs[item.versions + 1:]:
                    # 回滚/重新发布会复用 Repository，被保留版本引用的仓库不能删
                    if req.repository_id not in keep_ids and req.repository_id not in handled:
                        handled.add(req.repository_id)
                        req.repository.delete()
            except Exception as e:
                print(f'auto_run_by_day prune repositories of deploy {item.deploy_id} error: {e}')

        timer = defaultdict(int)
        for item in ExecHistory.objects.all():
            if timer[item.user_id] >= 10:
                item.delete()
            else:
                timer[item.user_id] += 1

        timer = defaultdict(int)
        for item in Transfer.objects.all():
            if timer[item.user_id] >= 10:
                item.delete()
            else:
                timer[item.user_id] += 1

        for task in Task.objects.all():
            try:
                record = TaskHistory.objects.filter(task_id=task.id)[50]
                TaskHistory.objects.filter(task_id=task.id, id__lt=record.id).delete()
            except IndexError:
                pass

        timestamp = time.time() - 2 * 3600
        transfer_root = Path(settings.TRANSFER_DIR)
        if transfer_root.exists():
            for item in transfer_root.iterdir():
                if item.name != '.gitkeep':
                    if item.stat().st_atime < timestamp:
                        transfer_dir = item.absolute()
                        os.system(f'umount -f {transfer_dir} > /dev/null 2>&1; rm -rf {transfer_dir}')
    finally:
        connections.close_all()


def auto_run_by_minute():
    try:
        now = datetime.now()
        # a single bad row must not break the loop, it also drives planned deploys
        for req in DeployRequest.objects.filter(status='2'):
            try:
                if not req.do_at:
                    continue
                if (now - parse_time(req.do_at)).total_seconds() > 3600:
                    req.status = '-3'
                    req.save()
            except Exception as e:
                print(f'auto_run_by_minute check request {req.id} error: {e}')

        for rep in Repository.objects.filter(status='1'):
            try:
                if (now - parse_time(rep.created_at)).total_seconds() > 3600:
                    rep.status = '2'
                    rep.save()
            except Exception as e:
                print(f'auto_run_by_minute check repository {rep.id} error: {e}')

        for req in DeployRequest.objects.filter(status='1', plan__lte=now):
            try:
                req.status = '2'
                req.do_at = human_datetime()
                req.do_by = req.created_by
                req.save()
                Thread(target=dispatch_all, args=(req,)).start()
            except Exception as e:
                print(f'auto_run_by_minute dispatch planned request {req.id} error: {e}')
    finally:
        connections.close_all()
