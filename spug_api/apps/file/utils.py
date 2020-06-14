# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.
from django.http import FileResponse
import stat
import time

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
            kind = "p"
        elif mt == stat.S_IFCHR:
            kind = "c"
        elif mt == stat.S_IFDIR:
            kind = "d"
        elif mt == stat.S_IFBLK:
            kind = "b"
        elif mt == stat.S_IFREG:
            kind = "-"
        elif mt == stat.S_IFLNK:
            kind = "l"
        elif mt == stat.S_IFSOCK:
            kind = "s"
        else:
            kind = "?"
        code = obj._rwx(
            (obj.st_mode & 448) >> 6, obj.st_mode & stat.S_ISUID
        )
        code += obj._rwx(
            (obj.st_mode & 56) >> 3, obj.st_mode & stat.S_ISGID
        )
        code += obj._rwx(
            obj.st_mode & 7, obj.st_mode & stat.S_ISVTX, True
        )
    else:
        kind = "?"
        code = '---------'
    return kind, code


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


def parse_sftp_attr(obj):
    if (obj.st_mtime is None) or (obj.st_mtime == int(0xffffffff)):
        date = "(unknown date)"
    else:
        date = time.strftime('%Y/%m/%d %H:%M:%S', time.localtime(obj.st_mtime))
    kind, code = parse_mode(obj)
    is_dir = stat.S_ISDIR(obj.st_mode) if obj.st_mode else False
    size = obj.st_size or ''
    return {
        'name': getattr(obj, 'filename', '?'),
        'size': '' if is_dir else format_size(size),
        'date': date,
        'kind': kind,
        'code': code
    }
