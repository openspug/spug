-- start update 1.0.0 --
CREATE TABLE `notify_way` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `desc` varchar(255) DEFAULT NULL,
  `value` text,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `name` (`name`) USING BTREE
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

ALTER TABLE `spug`.`deploy_apps` ADD COLUMN `notify_way_id` int(11) NULL DEFAULT NULL AFTER `group`;
ALTER TABLE `spug`.`deploy_apps` ADD CONSTRAINT `deploy_apps_ibfk_2` FOREIGN KEY (`notify_way_id`) REFERENCES `spug`.`notify_way` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `spug`.`deploy_apps` ADD INDEX `notify_way_id`(`notify_way_id`) USING BTREE;

INSERT INTO account_permissions (id, name, `desc`) VALUES (1301, 'system_notify_view', '系统通知列表');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1302, 'system_notify_add', '添加通知设置');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1303, 'system_notify_edit', '编辑通知设置');
INSERT INTO account_permissions (id, name, `desc`) VALUES (1304, 'system_notify_del', '删除通知设置');

-- end update 1.0.0 --

-- start update 1.1.0 --

INSERT INTO account_roles (id, name, `desc`) VALUES (1, '系统默认角色', '系统默认角色');

ALTER TABLE `spug`.`account_users` ADD COLUMN `type` varchar(20) NULL DEFAULT '系统用户' AFTER `is_supper`;

-- end update 1.0.1 --
