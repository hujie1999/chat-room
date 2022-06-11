
((doc,window)=>{
    const oList = doc.querySelector('#list')
    const oMsg = doc.querySelector('#message')
    const oSendBtn = doc.querySelector('#sendbtn')

    
    const oTarget = doc.querySelector('#target')
    const oPrivate = doc.querySelector('#private')
    const oOnLineList = doc.querySelector('#onlineList')
    const oSendPrivateBtn = doc.querySelector('#send_private_btn')
    //实例
    let ws = null
    //用户信息
    let username = ''
    const userid = new Date().getTime()

    //连接正常标识
    let isConnectionSuccess = false

    

    const init = ()=>{
        ws = new window.WebSocket('ws://127.0.0.1:8000')
        bindEvent()
    }
    const bindEvent = ()=>{
        oSendBtn.addEventListener('click',handleSendBtnClick,false)
        oSendPrivateBtn.addEventListener('click',handleSendPrivateBtnClick,false)
        ws.addEventListener('open',handleOpen,false)
        ws.addEventListener('close',hadnleClose,false)
        ws.addEventListener('error',handleError,false)
        ws.addEventListener('message',handleMessage,false)
        window.addEventListener('beforeunload',handleExit,false)
    }
    
    const handleSendBtnClick = (e)=>{
        const msg = oMsg.value;
        if(!msg.split(' ').join('').length){
            alert('内容为空，重新输入')
            return
        }
        ws.send(JSON.stringify({
            userid:userid,
            username: username,
            dataTime: new window.Date().getTime(),
            message: msg,
            eventName: 'public'
        }))

        oMsg.value = ''
        // console.log('Send message',e);
    }

    const handleSendPrivateBtnClick = ()=>{
        const privMsg = oPrivate.value
        const to = oTarget.value
        if(!privMsg.split(' ').join('').length){
            alert('内容为空，重新输入')
            return
        }
        if(!to.split(' ').join('').length){
            alert('请输入收信人id')
            return
        }
        ws.send(JSON.stringify({
            userid:userid,
            username: username,
            dataTime: new window.Date().getTime(),
            message: privMsg,
            eventName: 'private',
            to: to
        }))
    }
    const handleOpen = (e)=>{
        console.log('WebSocket open',e);
        //连接成功
        isConnectionSuccess = true
        reConnectedAndHealLog()
        //开启心跳
        // heartBeatReset()
        // heartBeatStart()
        username = window.localStorage.getItem('username')
        if(!username){
            window.location.href = 'entry.html'
            return
        }
        
        const initinfo = {
            userid:userid,
            username:username,
            eventName: 'onLine'
        }
        ws.send(JSON.stringify(initinfo))
    }
    const hadnleClose = (e)=>{
        console.log('服务器断开连接 WebSocket close',e);
        isConnectionSuccess = false
        ws = null
        reConnection()
    }
    const handleError = (e)=>{
        console.log('WebSocket error',e);
        isConnectionSuccess = false
        ws = null
        reConnection()
    }
    const handleExit = () =>{
        ws.send(JSON.stringify({
            userid: userid,
            username: username,
            eventName: 'outLine'
        }))
        ws.close()
    }
    const handleMessage = (e)=>{
        // console.log('WebSocket message',e);
        const msgData = JSON.parse(e.data)

        heartBeatReset()
        heartBeatStart()
        console.log(msgData)
        if(msgData.eventName=='onLine' || msgData.eventName=='outLine'){
            oList.appendChild(createStateDom(msgData))
            return
        }
        else if(msgData.eventName=='public'){
            oList.appendChild(createPbcMsgDom(msgData))
            return
        }
        else if(msgData.eventName=='private'){
            oList.appendChild(createPrivMsgDom(msgData))
        }
        else if(msgData.eventName=='onLineUserInfo'){
            // oOnLineList.removeChild()
            oOnLineList.appendChild(createOnLineUserDom(msgData))
        }
        //服务器 ping，需回pong ，表示连接正常
        else if(msgData.eventName=='ping'){
            ws.send(JSON.stringify({eventName:'pong'}))
        }
        
    }

    //创建上下线dom
    const createStateDom = (content) => {
        const { userid, username, eventName ,eventDesc } = content
        const oItem = doc.createElement('span')
        const stateStr = ()=>{
            if(eventName=='onLine'){
                return '上线了！'
            }
            else if(eventName=='outLine'){
                if(eventDesc){
                    return `因：${ eventDesc } 下线了！`
                }
                else{
                    return '下线了！'
                }
            }
        }
        oItem.innerHTML = `
            <p style='color:gray;font-size:12px'>
                <span>${ username } ${ stateStr() } !!!</span>
            </p>
        `;
        return oItem
    }
    //创建公共聊天dom
    const createPbcMsgDom = (content) => {
        const { username, dataTime, message} = content
        const oItem = doc.createElement('li')
        oItem.innerHTML = `
            <strong>
                <span>${ username }</span>
                <span>${ new Date(dataTime) }</span>
            </strong>
            <p> 说： ${ message }</p>
        `;
        return oItem
    }
    //创建私有聊天dom
    const createPrivMsgDom = (content) => {
        const { username, dataTime, message} = content
        const oItem = doc.createElement('li')
        oItem.innerHTML = `
            <div style="padding:5px 0px;background:orange;">
                <p> 来自： ${ username } 的私信：${new Date(dataTime)}</p>
                <p> 内容： ${ message }</p>
            </div>
        `;
        return oItem
    }
    //创建在线用户列表 
    const createOnLineUserDom = (content) => {
        if(oOnLineList.hasChildNodes()){
            var childs = oOnLineList.childNodes; 
            childs.forEach((element)=>{
                oOnLineList.removeChild(element)
            })
        }
        const { userList } = content
        const virtualList = doc.createElement('div')
        userList.forEach(element => {
            console.log(element)
            virtualList.innerHTML+= `
            <p>
                <span>${ element.name }</span>
                <span>( ${ element.id } )</span>
            </p>
        `;
        });
        
        return virtualList
    }

    //当前重连次数
    let reConnectCount = 0
    //最大重连次数
    const maxReConnecCount = 5
    //重连间隔 ms
    const reConnectTime = 5000
    //timer
    let time = null
    //重连锁
    let reConnectionLock = false
    //是否断线重连过？
    let isRecFlag = false


    //打印线成功 log
    const reConnectedAndHealLog = () => {
        if(isConnectionSuccess && isRecFlag){
            time && clearTimeout(time)
            reConnectionLock = false
            isRecFlag = false
            console.log(`重连成功，重连次数：${ reConnectCount }`)
            reConnectCount = 0
            return   
        }
    }
    //断线重连函数
    const reConnection = () => {
        isRecFlag = true
        if(reConnectionLock){
            return
        }
        
        
        reConnectionLock = true
        time = setTimeout(()=>{
            if(reConnectCount>=maxReConnecCount){
                time && clearTimeout(time)
                console.log(`重连失败，重连次数 ${ reConnectCount }，最大重连次数${ maxReConnecCount }`)
            }
            else{
                reConnectCount ++
                console.log(`重连第 ${ reConnectCount } 次`)
                init()
            }
            reConnectionLock = false

        },reConnectTime) 
    }


    //心跳检测事件 ms
    const heartBeatTime = 1000*15
    const heartBeatCloseTime = 1000*10
    let heartBeatTimeout  = null
    let heartBeatCloseTimeout = null
    //心跳开始
    const heartBeatStart = () => {
        heartBeatTimeout = setTimeout(()=>{
            //向服务器发起heartbeat，服务器返回任何数据说明连接正常
            //在message事件能收到数据，就reset 然后再开启
            console.log('heartbeat')
            ws.send(JSON.stringify({eventName:'heartbeat'}))
            heartBeatCloseTimeout = setTimeout(()=>{
                //如果 heartBeatCloseTime 内没有收到服务端的信息，说明掉线，关闭连接，再启动重连
                isConnectionSuccess = false
                ws.close()
                console.log('断开连接！！！')
                
                reConnection()
            },heartBeatCloseTime)
        },heartBeatTime)
    }
    //心跳重置
    const heartBeatReset = () => {
        heartBeatTimeout && clearTimeout(heartBeatTimeout)
        heartBeatCloseTimeout && clearTimeout(heartBeatCloseTimeout)
    }

    init()
    
})(document,window)