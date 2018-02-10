from flask import Blueprint, send_file, request
from libs.tools import json_response, JsonParser, Argument
import os
from config import BASE_DIR


blueprint = Blueprint(__name__, __name__)


@blueprint.route('/download/<string:file_name>', methods=['GET'])
def get(file_name):
    if file_name:
        temp_file = os.path.join(BASE_DIR, 'libs', 'template', '{}'.format(file_name))
        if temp_file:
            return send_file(temp_file)
        else:
            return json_response(message='模板文件未找到')
    else:
        return False


