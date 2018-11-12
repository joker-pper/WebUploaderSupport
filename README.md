# WebUploaderSupport

`demo演示地址`

[编辑示例](https://joker-pper.github.io/WebUploaderSupport/webuploader.support/edit.html)

[overload示例(可以定制(重写)函数)](https://joker-pper.github.io/WebUploaderSupport/webuploader.support/overload.html)

[展示示例](https://joker-pper.github.io/WebUploaderSupport/webuploader.support/show.html)

[flash示例](https://joker-pper.github.io/WebUploaderSupport/webuploader.support/flash.html)

[simple示例(不依赖于ui框架)](https://joker-pper.github.io/WebUploaderSupport/webuploader.support/simple.html)



WebUploaderSupport功能包括：

````
1.文件预览

2.文件删除

3.失败重试

4.加载服务端数据进行展示

5.可重写配置中support的已有的属性及方法进行更改相应的业务逻辑

6.支持文件个数限制(通过beforeFileQueued事件),加入是否为编辑模式,非编辑模式隐藏操作按钮,仅用于展示

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

删除文件的url请按需提供.

````


api函数：
````
upload()  上传当前实例的文件
retry()  重试上传当前实例的文件
isInProgress() return boolean  返回当前实例是否正在上传中
editChange(edit)   param edit:boolean 当前实例处于哪种模式(编辑or非编辑)
getCurrentFileSize() 当前文件个数
getSurplusFileSize() 剩余文件个数, -1时不限制
getMaxFileSize() 最大文件个数, -1时不限制
````

当前默认配置

````
主要参数配置(除了support外均为webuploader参数配置参数):
{

    support: { //support核心默认配置
        edit: true,   //是否为编辑模式
        log: false,    //是否打印信息
        multiple: true,  //默认多选
        fileSize: -1,  //文件总个数, -1时无限制
        uploader: ".uploader",  //上传区域容器选择器,用于初始化实例
        thumbnailWidth: 150, //缩略图宽度
        thumbnailHeight: 150,
        fileListMinHeight: 100, //fileList默认最小高度
        serverFiles: []  //服务端文件 当前为 [{name:string, src: string, attrs: {}}]
        serverFileAttrName: "data-server-file",  //服务端文件的属性名称
        deleteServerFileAttrName: "data-delete-url",
    }
}

var w1 = new WebUploaderSupport(option);
````

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
加载服务端文件列表json: 

[
  {
  "src":"../images/preview/1.jpg",
  "name":"1.jpg",
  "attrs":{
        "data-server-file":true, //作为服务端文件标识
        "data-delete-url":"" //删除该文件的url
    }  //存在的属性将作为item的属性值
  }
]
````

````
删除文件返回json: (可重写deleteServerFile及deleteServerFileCallback修改提示效果,参考overload.html）
{
    "status": boolean, //是否上传成功
    "content": string //失败时的提示
}
````


