from flask import request


def excel_parse():
    file = request.files['file']
    if file:
        return dict(request.get_dict(field_name='file'))