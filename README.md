# WebUploaderSupport

`demo演示地址`

https://joker-pper.github.io/WebUploaderSupport/webuploader.support/edit.html
<br />
<br />
https://joker-pper.github.io/WebUploaderSupport/webuploader.support/show.html
<br />
<br />
https://joker-pper.github.io/WebUploaderSupport/webuploader.support/flash.html
<br />
<br />
https://joker-pper.github.io/WebUploaderSupport/webuploader.support/simple.html
<br />
<br />
WebUploaderSupport功能包括：

````
1.文件预览

2.文件删除

3.失败重试

4.加载服务端数据进行展示

5.可重写配置中support的已有的属性及方法（除了$elements与$fns）,进行更改相应的业务逻辑

6.通过beforeFileQueued事件加入文件个数限制,加入是否为编辑模式,非编辑模式隐藏操作按钮,仅用于展示

7.默认文件不压缩上传,默认只接受图片类型上传

8.支持多实例，使用对应html模板，设置参数便可以进行使用

9.options配置基于webuploader,可以进行其他功能项配置

10.样式不依赖于其他前端ui框架
````
其他说明：
````
当前配置下html5模式默认支持拖拽.

webuploader实例仅有一个时粘贴功能才可以正常使用.

flash模式不支持拖拽不支持粘贴功能.

ie不支持粘贴功能.

swf参数请配置正确的路径.
````
函数：
````
upload()  上传当前实例的文件
retry()  重试上传当前实例的文件
isInProgress() return boolean  返回当前实例是否正在上传中
editChange(edit)   param edit:boolean 当前实例处于哪种模式(编辑or非编辑)
````

当前默认配置

````
上传成功服务端应返回json: 

{
    "status": boolean, //是否上传成功
    "attrs": {
        "data-server-file": true,  //服务端文件
        "data-delete-url": string,  //删除该服务端文件的url
    } 
}


````

````
删除文件返回json: (重写deleteServerFileCallback可进行修改提示效果）
{
    "status": boolean, //是否上传成功
    "content": string //失败时的提示
}
````


````
加载服务端文件列表json: 

[
  {
  "src":"../images/preview/1.jpg",
  "name":"1.jpg",
  "attrs":{
        "data-server-file":true,
        "data-delete-url":""
    }  //存在的属性将作为item的属性值
  }
]
````
