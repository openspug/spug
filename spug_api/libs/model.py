from public import db


def db_session_commit():
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise


class ModelMixin(object):
    __slots__ = ()

    def __init__(self, **kwargs):
        pass

    def save(self):
        db.session.add(self)
        db_session_commit()
        return self

    def delete(self, commit=True):
        db.session.delete(self)
        if commit:
            db_session_commit()

    def add(self):
        db.session.add(self)

    def update(self, **kwargs):
        required_commit = False
        for k, v in kwargs.items():
            if hasattr(self, k) and getattr(self, k) != v:
                required_commit = True
                setattr(self, k, v)
        if required_commit:
            db_session_commit()
        return required_commit

    @classmethod
    def upsert(cls, where, **kwargs):
        record = cls.query.filter_by(**where).first()
        if record:
            record.update(**kwargs)
        else:
            record = cls(**kwargs).save()
        return record

    def to_json(self, excludes=None, selects=None):
        if not hasattr(self, '__table__'):
            raise AssertionError('<%r> does not have attribute for __table__' % self)
        elif selects:
            return {i: getattr(self, i) for i in selects}
        elif excludes:
            return {i.name: getattr(self, i.name) for i in self.__table__.columns if i.name not in excludes}
        else:
            return {i.name: getattr(self, i.name) for i in self.__table__.columns}
