# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.http import FileResponse
import stat
import time
import os

KB = 1024
MB = 1024 * 1024
GB = 1024 * 1024 * 1024
TB = 1024 * 1024 * 1024 * 1024


class FileResponseAfter(FileResponse):
    def __init__(self, callback, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.callback = callback

    def close(self):
        super().close()
        self.callback()


def parse_mode(obj):
    if obj.st_mode:
        mt = stat.S_IFMT(obj.st_mode)
        if mt == stat.S_IFIFO:
            kind = 'p'
        elif mt == stat.S_IFCHR:
            kind = 'c'
        elif mt == stat.S_IFDIR:
            kind = 'd'
        elif mt == stat.S_IFBLK:
            kind = 'b'
        elif mt == stat.S_IFREG:
            kind = '-'
        elif mt == stat.S_IFLNK:
            kind = 'l'
        elif mt == stat.S_IFSOCK:
            kind = 's'
        else:
            kind = '?'
        code = obj._rwx(
            (obj.st_mode & 448) >> 6, obj.st_mode & stat.S_ISUID
        )
        code += obj._rwx(
            (obj.st_mode & 56) >> 3, obj.st_mode & stat.S_ISGID
        )
        code += obj._rwx(
            obj.st_mode & 7, obj.st_mode & stat.S_ISVTX, True
        )
        return kind + code
    else:
        return '?---------'


def format_size(size):
    if size:
        if size < KB:
            return f'{size}B'
        if size < MB:
            return f'{size / KB:.1f}K'
        if size < GB:
            return f'{size / MB:.1f}M'
        if size < TB:
            return f'{size / GB:.1f}G'
        return f'{size / TB:.1f}T'
    else:
        return ''


def fetch_dir_list(host, path):
    with host.get_ssh() as ssh:
        objects = []
        for item in ssh.list_dir_attr(path):
            code = parse_mode(item)
            kind, is_link, name = '?', False, getattr(item, 'filename', '?')
            if stat.S_ISLNK(item.st_mode):
                is_link = True
                try:
                    item = ssh.sftp_stat(os.path.join(path, name))
                except FileNotFoundError:
                    pass
            if stat.S_ISREG(item.st_mode):
                kind = '-'
            elif stat.S_ISDIR(item.st_mode):
                kind = 'd'
            if (item.st_mtime is None) or (item.st_mtime == int(0xffffffff)):
                date = '(unknown date)'
            else:
                date = time.strftime('%Y/%m/%d %H:%M:%S', time.localtime(item.st_mtime))
            objects.append({
                'name': name,
                'size': '' if kind == 'd' else format_size(item.st_size or ''),
                'date': date,
                'kind': kind,
                'code': code,
                'is_link': is_link
            })
    return objects
