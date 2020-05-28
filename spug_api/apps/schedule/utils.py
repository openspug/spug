# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the MIT License.
from apps.schedule.models import Task, History


def auto_clean_schedule_history():
    for task in Task.objects.all():
        try:
            record = History.objects.filter(task_id=task.id)[50]
            History.objects.filter(task_id=task.id, id__lt=record.id).delete()
        except IndexError:
            pass
