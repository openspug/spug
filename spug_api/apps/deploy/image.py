from public import app
from flask import Blueprint
from libs.tools import json_response, JsonParser
from libs.utils import Registry
from apps.deploy.models import Image, ImageTag, App
from libs.decorators import require_permission

blueprint = Blueprint(__name__, __name__)


@blueprint.route('/', methods=['GET'])
@require_permission('publish_image_view | publish_app_add')
def get():
    return json_response(Image.query.all())


@blueprint.route('/add', methods=['POST'])
@require_permission('publish_image_add')
def add():
    form, error = JsonParser('name','desc','tag').parse()
    if error is None:
        image = Image.query.filter_by(name=form.name).first()
        if image:
            return json_response(message='该镜像名字已经存在。')

        tag = form.pop('tag')
        res = Image(**form).save()

        if  res:
            ImageTag(image_id=res.id,name=tag).save()
            return json_response()

        return json_response(message='添加镜像失败,请稍后再试!')
    return json_response(message=error)

@blueprint.route('/sync', methods=['POST'])
@require_permission('publish_image_sync')
def sync():
    reg = Registry(base_url=app.config['DOCKER_REGISTRY_SERVER'])
    images = reg.list_images()
    for image in images:
        image_tags = reg.list_tags(image)
        if image_tags:
            image_row = Image.upsert({'name': image}, name=image)
        else:
            continue
        for tag in image_tags:
            tag_digest = reg.get_tag_digest(image, tag)
            tag_created = reg.get_last_modify_date(image, tag)
            ImageTag.upsert({'image_id': image_row.id, 'name': tag}, image_id=image_row.id, name=tag, digest=tag_digest,
                            created=tag_created)
    return json_response()


@blueprint.route('/sync/<int:image_id>', methods=['POST'])
@require_permission('publish_image_sync')
def sync_one(image_id):
    reg = Registry(base_url=app.config['DOCKER_REGISTRY_SERVER'])
    image = Image.query.get_or_404(image_id)
    for tag in reg.list_tags(image.name):
        tag_digest = reg.get_tag_digest(image.name, tag)
        tag_created = reg.get_last_modify_date(image.name, tag)
        ImageTag.upsert({'image_id': image.id, 'name': tag}, image_id=image.id, name=tag, digest=tag_digest,
                        created=tag_created)
    return json_response()


@blueprint.route('/<int:img_id>', methods=['PUT'])
@require_permission('publish_image_edit')
def put(img_id):
    form, error = JsonParser('desc').parse()
    if error is None:
        image = Image.query.get_or_404(img_id)
        image.update(**form)
        return json_response()
    return json_response(message=error)


@blueprint.route('/<int:img_id>', methods=['DELETE'])
@require_permission('publish_image_del')
def delete(img_id):
    image = Image.query.get_or_404(img_id)
    if image.tags:
        return json_response(message='删除该镜像所有标签后，才能删除该镜像。')
    used_app = App.query.filter_by(image_id=image.id).first()
    if used_app:
        return json_response(message='应用 %s 还在使用该镜像，请解除关联后再尝试删除该镜像。' % used_app.name)
    image.delete()
    return json_response()


@blueprint.route('/<int:img_id>/tags/', methods=['GET'])
@require_permission('publish_image_view')
def tag_get(img_id):
    tags = ImageTag.query.filter_by(image_id=img_id).order_by(ImageTag.created.desc()).all()
    return json_response(tags)


@blueprint.route('/<int:img_id>/tags/<int:tag_id>', methods=['DELETE'])
@require_permission('publish_image_del')
def tag_delete(img_id, tag_id):
    img = Image.query.get_or_404(img_id)
    tag = ImageTag.query.get_or_404(tag_id)
    reg = Registry(base_url=app.config['DOCKER_REGISTRY_SERVER'])
    reg.delete(img.name, tag.digest)
    tag.delete()
    return json_response()
