# WebUploaderSupport
进行一些配置便可以运行起来webuploader实例，已拥有一定的业务逻辑。可以进行覆盖对应的属性。

WebUploaderSupport功能包括：

#
1.图片预览
#
2.图片删除
#
3.失败重试
#
4.加载服务端数据进行展示
#
5.可重写配置中support的已有的属性及方法（除了$elements与$fns）,进行更改相应的业务逻辑
#
6.通过beforeFileQueued事件加入文件个数限制
#
7.默认不压缩图片上传
#
8.options配置通过参考webuploader,可以进行其他功能配置
#
9.支持多实例，使用对应html模板，设置参数便可以进行使用
####
其他说明：
#
当前配置下html5模式默认支持拖拽.
#
flash模式不支持拖拽不支持粘贴功能.
#
ie不支持粘贴功能.
#
swf参数请配置正确的路径.
