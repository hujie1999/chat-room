
((doc,window)=>{
    const oUserName = doc.querySelector('#username')
    const oEnterBtn = doc.querySelector('#enterbtn')

    const init = ()=>{
        bindEvent()
    }

    const bindEvent = ()=>{
        oEnterBtn.addEventListener('click',handleEnterBtn,false);
    }


    const handleEnterBtn = ()=>{
        const username = oUserName.value
        if(username.split(' ').join('').length<6){
            alert('请输入至少6位用户名')
            return
        }
        window.localStorage.setItem('username',username)
        window.location.href = 'chat.html'
    }

    init()
})(document,window)