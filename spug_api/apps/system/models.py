from public import db
from libs.model import ModelMixin


class NotifyWay(db.Model, ModelMixin):
    __tablename__ = 'notify_way'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True)
    value = db.Column(db.Text)
    desc = db.Column(db.String(255))

    def __repr__(self):
        return '<NotifyWay %r>' % self.name

    class Meta:
        ordering = ('-id',)
