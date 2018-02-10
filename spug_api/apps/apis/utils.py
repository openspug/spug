from collections import defaultdict
from apps.configuration.models import Environment


class MapConfigValues(object):
    def __init__(self, values, env_id):
        environments = Environment.query.all()
        sort_environments = sorted([x for x in environments if x.id != env_id], key=lambda x: x.priority)
        self.env_ids = [env_id] + [x.id for x in sort_environments]
        self.env_id = env_id
        self.map_values = defaultdict(dict)
        [self.map_values[x.key_id].__setitem__(x.env_id, x.value) for x in values]

    def _iter_value(self, map_value):
        for env_id in self.env_ids:
            value = map_value.get(env_id)
            if value:
                return value

    def get(self, key_id):
        map_value = self.map_values.pop(key_id, None)
        if map_value:
            return self._iter_value(map_value)

