from public import db
from libs.model import ModelMixin
from libs.tools import human_time
from datetime import datetime


class Job(db.Model, ModelMixin):
    __tablename__ = 'schedule_jobs'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    desc = db.Column(db.String(255))
    group = db.Column(db.String(50))
    command_user = db.Column(db.String(50))
    command = db.Column(db.String(255))
    targets = db.Column(db.String(255))
    trigger = db.Column(db.String(50))
    trigger_args = db.Column(db.String(255))
    enabled = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return '<schedule.Job name=%r trigger=%r>' % (self.name, self.trigger)

    class Meta:
        ordering = ('-id',)


class JobHistory(db.Model, ModelMixin):
    __tablename__ = 'schedule_jobs_history'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('schedule_jobs.id', ondelete='CASCADE'))
    target = db.Column(db.String(50))
    exit_code = db.Column(db.Integer)
    stdout = db.Column(db.Text)
    stderr = db.Column(db.Text)
    time_cost = db.Column(db.Float)
    created = db.Column(db.String(20))

    @classmethod
    def write(cls, job_id, start_time, target, exit_code, stdout, stderr):
        cls(
            job_id=job_id,
            target=target,
            exit_code=exit_code,
            stdout=stdout[:1024],
            stderr=stderr[:1024],
            time_cost=round((datetime.now() - start_time).total_seconds(), 3),
            created=human_time(start_time)
        ).save()

    def __repr__(self):
        return '<schedule.JonHistory id=%r job_id=%r>' % (self.id, self.job_id)

    class Meta:
        ordering = ('-id',)
