const YouHostLive = (function () {
  const _version = '0.1.9-beta'; // major.minor.patch
  const _appName = getAppName();
  const _appModeratorNames = ['livehotseat','youhost'];
  const _isModerator = _appModeratorNames.includes(_appName);
  const _isHostOnClient = isHostOnClient();
  const _appClientNames = ['polrized', 'weekdaze'];
  const _appModerated = 'weekdaze';
  const _isClient = _appClientNames.includes(_appName);
  const _isDev = window.location.hostname.includes('.wstd.io');
  const supabaseUrl = 'https://edfgdkdaurrrygzyfiyc.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZmdka2RhdXJycnlnenlmaXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDczNzgsImV4cCI6MjA3MTQyMzM3OH0.AWa3MC8T7nPYukDU7BI5yc9BOe5XbKCMV_1-R8RI6ZE';
  const _liveBtn = document.getElementById('live-button');
  const _audienceToggle = document.getElementById('audience-toggle');
  const _imageGrid = document.querySelector('.image-grid');

  let _initialized = false, _isLive = null;
  let _captchaReset = false;
  let _captchaTimestamp = null, _captchaToken = null;
  let _liveAudienceVideo = null, _updateLiveAudienceUserIntervalId;
  let _sbc, _publicChannel = null, _privateChannel = null, _userSession = null, _display_name, _comment;
  let _users = {}, _debounceTimer = null, _fetchedUrls = new Map(), _private_channels = new Map();
  let _youHostLiveUserIds = [], _youHostLiveIsActive = false, _youHostLiveFilter;
  let _session, _layout, _layoutEl;
  let _subscribers = []
  let _subscribeCallback = null;
  let _ytplayeriframe = null;
  let _ytplayer = null;
  let _youTubeVideoId = null;


  let _loadingDots = 3;
  let _loadingFn = ()=>{
    const loadingTextEl = document.getElementById('loading-text');
    _loadingDots += 1;
    switch (_loadingDots) {
      case 1: loadingTextEl.innerHTML = 'Loading.'; break;
      case 2: loadingTextEl.innerHTML = 'Loading..'; break;
      case 3: loadingTextEl.innerHTML = 'Loading...'; break;
      default: 
        loadingTextEl.innerHTML = 'Loading';
        _loadingDots = 0;
        break;
    }
  };
  let _loadingInterval = setInterval(_loadingFn, 1000);
  _loadingFn();


  async function init() {
    if (_initialized) return;
    _initialized = true;

    checkLocalStorage();
    checkAppWebsitePermission();

    await Promise.all([
      loadScript("https://apis.google.com/js/platform.js", false),
      loadScript("https://www.youtube.com/iframe_api", false),
      loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js", false),
      loadScript("https://unpkg.com/@supabase/supabase-js@2.43.3/dist/umd/supabase.js", false),
      loadScript("https://unpkg.com/gsap@3/dist/gsap.min.js", false),
      loadScript("https://unpkg.com/gsap@3/dist/TextPlugin.min.js", false),
      loadScript("https://unpkg.com/gsap@3/dist/SplitText.min.js", false),
      loadScript("https://unpkg.com/@vonage/client-sdk-video@2/dist/js/opentok.js", false),
      loadScript("https://unpkg.com/opentok-layout-js@5.5.0/opentok-layout.js", false),
      loadScript(`https://youhostlive.nightowllogic.com/${_isDev ? _appName : _appName + ""}.js`, true),
      loadStyle("https://youhostlive.nightowllogic.com/common.css"),
      loadStyle(`https://youhostlive.nightowllogic.com/${_appName}.css`)
    ]);

    // Setup main connection and check show status. Captcha done here on load.
    // Not sure if I'm handling fails here at all..
    _sbc = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // Captcha element for non-interactive mode.
    const turnstile_div = document.createElement("div");
    turnstile_div.id = 'turnstile-container';
    document.body.appendChild(turnstile_div);

    // Version element
    const version_div = document.createElement("div");
    version_div.id = 'version';
    version_div.style.display = 'none';
    version_div.innerHTML = _version;
    document.body.appendChild(version_div);

    // Check server version vs client version
    await checkVersion();

    // Handle Auth States
    _sbc.auth.onAuthStateChange( async (event, session) => {
      console.log('onAuthStateChange', event, session, _userSession);
      switch (event) {
        
        case 'INITIAL_SESSION':
          const { error, success } = await loginWithCurrentSession();
          if (error) throw error;
          if (success) {
            _userSession = session;
            await isShowLive(true);
          } else {
            _userSession = null;
          }

          if (_isModerator){
            if (success){
              await startHostRealtime();
            } else {
              document.getElementById('sign-in-flexbox').style.display = 'flex';
            }
          }

          if (_isClient){
            if (success){
              
            } else {
              await isShowLive();
              _captchaToken = null;
            }
          }
        break;
      
        case 'SIGNED_IN': // With Email/Password
          _userSession = session;

          if (_isModerator && _publicChannel == null){
            await isShowLive(true);
            await startHostRealtime();
          }          
        break;
          
        default:
          break;
      }
    });

    if (_isClient){
      // YouTube Subscribe.
      const ytsubscribe_div = document.createElement("div");
      ytsubscribe_div.className = 'g-ytsubscribe';
      ytsubscribe_div.dataset.channelid = 'UCHBn_I8jT29vLiu9Che-Lew';
      ytsubscribe_div.dataset.layout = 'default';
      ytsubscribe_div.dataset.count = 'default';
      ytsubscribe_div.dataset.theme = 'dark';

      document.body.appendChild(ytsubscribe_div);
      if (window.gapi?.ytsubscribe?.go) {
        gapi.ytsubscribe.go();
      }

      document.getElementById('text-name').setAttribute('maxlength', '25');
      document.getElementById('textarea-comment').setAttribute('maxlength', '130');

      // Create Video Live Audience Video
      _liveAudienceVideo = document.createElement('video');
      _liveAudienceVideo.id = 'user-camera-live-audience-video';
      _liveAudienceVideo.style.width = '160px';
      _liveAudienceVideo.style.height = '160px';
      _liveAudienceVideo.style.borderRadius = '6px';
      _liveAudienceVideo.style.background = '#000';
      _liveAudienceVideo.style.display = 'block';
      _liveAudienceVideo.style.objectFit = 'cover';
      _liveAudienceVideo.autoplay = true;
      _liveAudienceVideo.playsInline = true;
      _liveAudienceVideo.addEventListener('loadeddata', async function() {
        // ***************************************************************************
        handleSubscribeCallback({ event: 'SIGNED_IN_WITH_EMAIL'});  
        await startAnonymousRealtime();
        // ***************************************************************************
      });     
      const liveAudienceBody = document.getElementById('live-audience-body');
      const sib = document.getElementById('sign-out-camera-button');
      liveAudienceBody.insertBefore(_liveAudienceVideo, sib); 
    }


    // Other HTML & Listeners

    // Handle Live Show Toggling
    if (_isModerator){
      _liveBtn.addEventListener('mouseup', async ()=>{
        await toggleShowIsLive();
      });

      _imageGrid.style.display = (_imageGrid.dataset.state == 'checked') ? 'flex' : 'none';

      _audienceToggle.addEventListener('mouseup', async (e)=>{
        switch (e.target.dataset.state) {
          case 'unchecked':
            _imageGrid.style.display = 'none';
            break;
         case 'checked':
            _imageGrid.style.display = 'flex';
            break;        
          default:
            break;
        }
      });
    }

    // Track if the website is in active viewing.
    window.addEventListener("blur", () => _isBlurred = true );
    window.addEventListener("focus", () => _isBlurred = false );

    // Create TokBox Template container
    const tokbox_layout_div = document.createElement("div");
    tokbox_layout_div.id = 'layoutContainer';
    document.body.appendChild(tokbox_layout_div);

    // Start the Animation and show stuff.
    clearInterval(_loadingInterval);
    document.getElementById('loading-dialog').style.display = 'none';
    document.getElementById('loading-text').innerHTML = 'Loading...';
    handleSubscribeCallback({ event: 'READY'});
  }

  function getAppName(){
    // Get script as called from a src tag with querystring params.
    const script = document.currentScript;
    // Create a URL object from the script's src
    const url = new URL(script.src);
    // Use URLSearchParams to extract query values
    const params = new URLSearchParams(url.search);
    // Access individual query parameters
    const app = params.get('app');
    return app;
  }

  function isHostOnClient(){
    const isHostOnClient = localStorage.getItem('is-host-on-client');
    return isHostOnClient;
  }

  function checkLocalStorage(){
    // const lsYouHostLiveUserId = localStorage.getItem('YouHostLiveUserId');
    // if (lsYouHostLiveUserId != null){
    //   _youHostLiveUserId = lsYouHostLiveUserId;
    // }
    // const lsYouHostLiveUserIds = localStorage.getItem('YouHostLiveUserIds');
    // if (lsYouHostLiveUserIds != null){
    //   _youHostLiveUserIds = JSON.parse(lsYouHostLiveUserIds);
    // }    
  }

  function checkAppWebsitePermission(){
    if (!_isClient && !_isModerator)
      throw new Error("You Host Live App Website Permission Error.");

    const testOriginCom = _isDev ? `https://${_appName}com.wstd.io`
                             : `https://www.${_appName}.com`;
    const testOriginLive = _isDev ? `https://${_appName}live.wstd.io`
                             : `https://www.${_appName}.live`;
							 
    if (window.location.origin != testOriginCom && window.location.origin != testOriginLive) 
      throw new Error("You Host Live App Website Permission Error.");
  }

  function handleSubscribeCallback(e){
    if (typeof _subscribeCallback === 'function'){
      _subscribeCallback(e);
    }
  }

  function subscribe(fn){
    _subscribeCallback = fn;
  }

  function renderLiveStreamOnClient(){
      _ytplayeriframe = document.createElement('iframe');
      _ytplayeriframe.id = 'ytplayeriframe';
      _ytplayeriframe.type = 'text/html';
      _ytplayeriframe.src = `https://www.youtube-nocookie.com/embed/${_youTubeVideoId}?si=RW9jDGDcqqPgCgr6$?autoplay=0&rel=0&playsinline=1&keyboard=0&iv_load_policy=3&fs=0&controls=0&mute=0&enablejsapi=1&showinfo=0&modestbranding=1`; 
      _ytplayeriframe.allow = "accelerometer; autoplay;"
      // _ytplayeriframe.src = `https://www.youtube-nocookie.com/embed/${_youTubeVideoId}?autoplay=0&rel=0&playsinline=1&keyboard=0&iv_load_policy=3&fs=0&controls=0&mute=0&enablejsapi=1&showinfo=0&modestbranding=1`; 
      _ytplayeriframe.style.width = '100vw';
      _ytplayeriframe.style.height = '100vh';
      _ytplayeriframe.style.position = 'absolute';
      _ytplayeriframe.style.border = 'none';
      _ytplayeriframe.style.zIndex = 2;
      const fullscreenVideoContainer = document.getElementById('fullscreen-video-container');
      const fullscreenSib = document.getElementById('vimeoplayer');
      fullscreenVideoContainer.insertBefore(_ytplayeriframe, fullscreenSib);
      
      // Bring to front
      fullscreenVideoContainer.style.zIndex = 3;

      // HTML Ready, create YT Player
    _ytplayer = new YT.Player('ytplayeriframe', { /* ...options... */ });
    
    _ytplayer.addEventListener('onStateChange', function(event) {
      if (event.data === YT.PlayerState.PLAYING) {
        // Video started playing
        fullscreenVideoContainer.style.zIndex = -1;
        _ytplayer.setVolume(100);
      }
    });
    
    document.getElementById('vimeoplayer').remove();
  }

  async function startYouHostLive(e) {
    if (_liveAudienceVideo != null && _privateChannel != null){
      stopLiveAudience(true);
      
      if (_ytplayeriframe && _ytplayeriframe.parentNode) {
        _ytplayeriframe.parentNode.removeChild(_ytplayeriframe);
      }

      // 2. Clear the YT.Player instance (optional, for good practice)
      if (_ytplayer) {
        _ytplayer = null;
      }

      await _privateChannel.send({
          type: 'broadcast',
          event: 'private_message',
          payload: {
              user_id: _userSession.user.id,
              display_name: _display_name,
              acceptedYouHostLive: true,
              sent_at: new Date().toISOString()
          }
      });
    }

    const { applicationId, sessionId, token }  = await callFunction('vonage-session-endpoint', { name: 'Functions', role: _isModerator ? 'moderator' : 'publisher' });
 
    if (_layout == null) initOpenTokLayoutContainer();
    const youHostLiveContainerEl = document.getElementById('layoutContainer');
    youHostLiveContainerEl.style.display = 'flex';

    _subscribers = [];
    initializeSession(applicationId, sessionId, token, e);
  }

  async function stopYouHostLive() {
    const youHostLiveContainerEl = document.getElementById('layoutContainer');
    youHostLiveContainerEl.style.display = 'none';
    if (_isModerator){
      _youHostLiveUserIds.forEach( async(youHostLiveUserId) => await sendUserMessage( youHostLiveUserId, { closeYouHostLive:true }));
      _youHostLiveUserIds = [];
      // localStorage.setItem('YouHostLiveUserIds', JSON.stringify(_youHostLiveUserIds));
      // await sendUserMessage( _youHostLiveUserId, { closeYouHostLive:true });
      // _youHostLiveUserId = null;
      // localStorage.setItem('YouHostLiveUserId', null);

    } else {
      await _privateChannel.send({
        type: 'broadcast',
        event: 'private_message',
        payload: {
            user_id: _userSession.user.id,
            closeYouHostLive: true,
            sent_at: new Date().toISOString(),
        }
      }); 
    }
    _session.disconnect();
    location.reload();
  }

  async function loadScript(src, bustIfDev = true) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      if (_isDev && bustIfDev) {
        s.src = src + "?v=" + new Date().getTime();
      } else {
        s.src = src;
      }
      
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadStyle(href) {
    return new Promise((resolve, reject) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href + "?v=" + new Date().getTime();
      l.onload = resolve;
      l.onerror = reject;
      document.head.appendChild(l);
    });
  }

  async function loginWithEmail(email, password){
    console.log("Logging in with email/password...", getLocalTime());
    const captchaToken = await renderTurnstile();
    const { data, error } = await _sbc.auth.signInWithPassword({ email, password, options: { captchaToken } });
    const success = data.session != null;
    if (success) {
        console.log('Logging in with current session: Success.', data, error, getLocalTime());
        handleSubscribeCallback({ event: 'SIGNED_IN_WITH_EMAIL'});
      } else {
      console.log("Logging in with current session: Failed.");
    }
  }

  async function loginWithCurrentSession(){
    console.log("Logging in with current session...");

    const { data, error } = await _sbc.auth.getSession();
    const success = data.session != null;
    if (success) {
        console.log('Logging in with current session: Success.', data, error, getLocalTime());
        handleSubscribeCallback({ event: 'SIGNED_IN_WITH_CURRENT_SESSION'});
      } else {
      console.log("Logging in with current session: Failed.");
    }
    return { error, success };
  }

  async function checkVersion(){
    const version = await callFunction('version', { name: 'Functions' });
    if (version.version != _version) {
      alert(`Version mismatch: ${version.version} != ${_version}`);
      throw new Error(`Version mismatch: ${version.version} != ${_version}`);
      // location.reload(true);
    }
    document.getElementById('version').style.display = 'block';
  }

  function styleLiveBtn(){
    _liveBtn.innerHTML = _isLive ? `End Live (${_appModerated})` : `Go Live (${_appModerated})`;
    _liveBtn.style.display = 'inline-block';
  }
  
  async function isShowLive(noToken = false){
    if (noToken){
      const { isLive, youTubeVideoId } = await callFunction('is-show-live-no-token', { 
        name: 'Functions', 
        app_name: _isModerator ? _appModerated : _appName
      });
      _isLive = isLive;
      _youTubeVideoId = youTubeVideoId;
    } else {
      const token = await renderTurnstile();
      const { isLive, youTubeVideoId } = await callFunction('is-show-live', { 
        name: 'Functions', 
        token, 
        app_name: _isModerator ? _appModerated : _appName
      });
      _isLive = isLive;
      _youTubeVideoId = youTubeVideoId;
    }
    if (_isModerator) styleLiveBtn();
    if (_isClient && _isLive) {
      document.getElementById('open-you-host-live-button').style.display = 'inline-block';
      if (!_isHostOnClient)  // I DON'T LIKE THIS ANYMORE. OR DO I?
        renderLiveStreamOnClient();  
      
    }
  }

  async function toggleShowIsLive(){
    _liveBtn.style.display = 'none';
    const { isLive } = await callFunction('set-is-show-live', 
      { 
        name: 'Functions', 
        isLive: !_isLive, 
        app_name: _appModerated,
        youTubeVideoId: _youTubeVideoId
      });
    if (typeof isLive !== 'boolean') throw new Error(`Failed ${_appModerated} is Live...`);
    _isLive = !_isLive;
    styleLiveBtn();
    await handleLiveAudienceIsLive();
  }

  async function handleLiveAudienceIsLive(){
    if (!_isLive && Object.keys(_users).length > 0){
        Object.keys(_users).forEach( async (userId) => { 
          await sendUserMessage(userId, { isLive: false });
        });
    }
  }

  async function loginAnonymously(){
    console.log("Anonymously Logging in...");
    const captchaToken = await renderTurnstile();
    const { data, error } = await _sbc.auth.signInAnonymously({options: { captchaToken }});
    const success = data.session != null;
    if (success) {
        console.log('Anonymously Logging in: Success.', data, error, getLocalTime());
        handleSubscribeCallback({ event: 'SIGNED_IN_ANONYMOUSLY'});
      } else {
      console.log("Logging in with current session: Failed.");
    }
  };

  async function getLiveAudienceImage(filePath) {
      const { data, error } = await _sbc
          .storage
          .from('live-audience-images')                // bucket name
          .download(filePath)    // file path within bucket

      if (error) {
          console.error('Download error:', error)
          return
      }

      return data;
  }  

  // Handle Image Grid using the internal user objects.
  // users and _users are basically the same. users updated the _users before coming here.
  // I couldn't decide how to handle it so just used both.
  // The point is it removes first by testing existance, then everything else is either updated or added.
  // Existance = image tag with user_id is in the current users list.
  function renderGrid(users) {
      const onlineUserIds = Object.keys(_users);
      const imgs = document.querySelectorAll('.image-grid img');

      // Remove User Images
      imgs.forEach(
          img => {
              if (!onlineUserIds.includes(img.id)){
                  const parent = img.closest('.image-item');
                  removeImageSmoothly(parent);
                  _private_channels.delete(img.id);
                  _youHostLiveUserIds = _youHostLiveUserIds.filter( userId => !_youHostLiveUserIds.includes(userId));
                  // localStorage.setItem('YouHostLiveUserIds', JSON.stringify(_youHostLiveUserIds));
                  // if (img.id == _youHostLiveUserId){
                  //   _youHostLiveUserId = null;
                  //   localStorage.setItem('YouHostLiveUserId', null);
                  // }
              }
          }
      )

      // Add/Update User Images
      users.forEach(u => updateUserImage(u));
  }
  
  async function resolveImageUrl(path) {
      if (_fetchedUrls.has(path)) {
          return _fetchedUrls.get(path);
      }

      const data = await getLiveAudienceImage(path);
      const url = URL.createObjectURL(data)
      _fetchedUrls.set(path, url);

      return url;
  }
  
  async function offerYouHostLive(liveAudienceUserId){
    const userImgEl = document.getElementById(liveAudienceUserId).closest('.image-item'); 
    if (userImgEl.classList.contains('selected')){
      await sendUserMessage( liveAudienceUserId, { declineYouHostLive: true });
      _youHostLiveUserIds = _youHostLiveUserIds.filter( userId => userId != liveAudienceUserId);
      // localStorage.setItem('YouHostLiveUserIds', JSON.stringify(_youHostLiveUserIds));
      // _youHostLiveUserId = null;
      // localStorage.setItem('YouHostLiveUserId', null);
      userImgEl.classList.remove('selected');
    } else {
      await sendUserMessage( liveAudienceUserId, { offerYouHostLive: true });
      _youHostLiveUserIds.push(liveAudienceUserId);
      // localStorage.setItem('YouHostLiveUserIds', JSON.stringify(_youHostLiveUserIds));
      // _youHostLiveUserId = liveAudienceUserId;
      // localStorage.setItem('YouHostLiveUserId', _youHostLiveUserId);
      userImgEl.classList.add('selected');
    }
  }

  function onPrivateMessage(data){
    const payload = data.payload;
    console.log('onPrivateMessage', payload);

    // Check for Live Hot Seat and join if live audience user accepted.
    if (!('user_id' in payload)) return;
    // if (_youHostLiveUserId != payload.user_id) return;
    if (!_youHostLiveUserIds.includes(payload.user_id)) return;

    if (_youHostLiveIsActive){
        if ('closeYouHostLive' in payload && payload.closeYouHostLive){
            stopYouHostLive();
        }
    } else {
        if (!('acceptedYouHostLive' in payload)) return;
        _youHostLiveIsActive = true;
        // _youHostLiveFilter = payload.filter;
        if (_isModerator) _liveBtn.style.display = 'none';
        // _imageGrid.style.display = 'none';
        document.getElementById('close-you-host-live-flexbox').style.display = 'flex';
        startYouHostLive(); 
    }
  }

  async function sendUserMessage(userId, message){
      if (!_private_channels.has(userId)) return;
      
      const user_private_channel = _private_channels.get(userId);

      try {
        await user_private_channel.send({
            type: 'broadcast',
            event: 'private_message',
            payload: {
                message,
                sent_at: new Date().toISOString(),
            }
        });      
        console.log(`Message Sent to ${userId}: ${message}`);  
      } catch (error) {
        throw new Error(error);
      }

  }
  
  function subscribeToUserPrivateChannel(userId){
      if (_private_channels.has(userId)) {
        return _private_channels.get(userId);
      }

      const privateChannel = _sbc.channel(`room:${userId}:messages`, {
          config: { private: true, broadcast: { ack: true } },
      });
  
      privateChannel.on('broadcast', { event: 'private_message' }, onPrivateMessage).subscribe();
  
      _private_channels.set(userId, privateChannel);

      console.log(`subscribeToUserPrivateChannel: room:${userId}:messages`);
      
      return privateChannel;
  }

  function removeImageSmoothly(imgEl) {
      const sec = 0.3;
      imgEl.style.transition = `opacity ${sec}s ease`;
      imgEl.style.opacity = 0;
      // Remove but match the fade duration in milliseconds
      setTimeout(() => imgEl.remove(), sec * 1000); 
  }

  function updateUserImage(u) {
      const container = _imageGrid;
      const existingImg = document.getElementById(`${u.user_id}`);

      if (existingImg) {
          existingImg.src = u.live_audience_image_url;
          // existingImg.style.filter = u.filter;
      } else {
          // Create once if not existing
          const div = document.createElement('div');
          div.className = 'image-item';

          if (_youHostLiveUserIds.includes(u.user_id)) div.classList.add('selected');
          // if (u.user_id == _youHostLiveUserId) div.classList.add('selected');

          const img = document.createElement('img');
          img.id = `${u.user_id}`;
          img.src = u.live_audience_image_url;
          img.loading = 'lazy';
          img.alt = `User ${u.user_id}`;
          img.title = `[ ${u.display_name} ] ${u.comment}`;
          // img.style.filter = u.filter;

          const btn = document.createElement('button');
          btn.className = 'hover-btn';
          btn.textContent = 'Live Stage'
          btn.style = 'font-size: .2rem';

          div.appendChild(img);
          div.appendChild(btn);
          container.appendChild(div);
      }
  }
  
  async function startHostRealtime(){
    console.log("Connecting Host Real-time...", getLocalTime());

    // Public channel
    _publicChannel = _sbc.channel(_appModerated, {
        config: {
            private: false, broadcast: { self: true, ack: true },
            presence: {
                key: _userSession.user.id
            }
        }
    });
    
    // Subscribe to Public Channel
    _publicChannel
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            _users[key] = newPresences[0];
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
            delete _users[key];
        })
        .on('presence', { event: 'sync' }, () => {

            // Keep local user state updated.
            const states = _publicChannel.presenceState();

            Object.assign(_users, states);                  

            if (Object.keys(_users).length > 0){
                Object.keys(_users).forEach( userId => { 
                  subscribeToUserPrivateChannel(userId); 
                });
            }
            
            // Update Image Grid after updates pause for the time set.
            // Only if Live Hot Seat is not Active.

            clearTimeout(_debounceTimer);
            _debounceTimer = null;
            
            // if (_youHostLiveIsActive){ return }

            _debounceTimer = setTimeout(async () => {
                const entries = Object.entries(states).map(async ([id, [u]]) => ({
                    ...u,
                    user_id: id,
                    live_audience_image_url: await resolveImageUrl(u.live_audience_image)
                }));
                const resolvedUsers = await Promise.all(entries);
                renderGrid(resolvedUsers);
            }, 1000);
        }).subscribe();
    console.log("Connected Host Real-time...", getLocalTime());
  }

  async function startAnonymousRealtime(){
    console.log("Connecting Anonymous Real-time...", getLocalTime());
    try {
        const topic = `room:${_userSession.user.id}:messages`;
        _privateChannel = _sbc.channel(topic, {
            config: { private: true, broadcast: { ack: true } },
        });
        _publicChannel = _sbc.channel(_appName, {
            config: {
                private: false, broadcast: { self: true, ack: true },
                presence: {
                    key: _userSession.user.id
                }
            }
        });
        
        _publicChannel.subscribe(async (status) => {
            if (status !== 'SUBSCRIBED') { return }

            const sliderCameraBlur = document.getElementById('camera-blur');
            const imageDataObj = getImage(_liveAudienceVideo);
            const live_audience_image = await uploadLiveAudienceImage({ user_id: _userSession.user.id, dataURL: imageDataObj.dataURL });
            console.log("Upload Live Audience Image. Success!", getLocalTime());

            _publicChannel.track({ 
                updated_at: getLocalTime(), 
                display_name: _display_name, 
                live_audience_image, 
                comment: _comment, 
                width: imageDataObj.width, 
                height: imageDataObj.height,
                // filter: `blur(${sliderCameraBlur.value}px)` 
            });
            _updateLiveAudienceUserIntervalId = setInterval( async function(){
                const imageDataObj = getImage(_liveAudienceVideo);
                const live_audience_image = await uploadLiveAudienceImage({ user_id: _userSession.user.id, dataURL: imageDataObj.dataURL });
                console.log("Upload Live Audience Image. Success!", getLocalTime());

                _publicChannel.track({ 
                    updated_at: getLocalTime(), 
                    display_name: _display_name, 
                    live_audience_image, 
                    comment: _comment, 
                    width: imageDataObj.width, 
                    height: imageDataObj.height,
                    isFocused: !window.isBlurred,
                    // filter: `blur(${sliderCameraBlur.value}px)`
                });
                
            }, 10000);
            console.log('Subscribed to public channel.');
        })      
    
        // Private channel with host
        _privateChannel
            .on('broadcast', { event: 'private_message' }, (data) => {
                console.log('Received Real-time Message: ', data.payload);
                if ('offerYouHostLive' in data.payload.message && data.payload.message.offerYouHostLive){
                    gsap.set("#accept-you-host-live-flexbox", { display: 'flex', top: '50%' });
                }
                if ('declineYouHostLive' in data.payload.message && data.payload.message.declineYouHostLive){
                    gsap.set("#accept-you-host-live-flexbox", { display: 'none'});
                }                
                if ('closeYouHostLive' in data.payload.message && data.payload.message.closeYouHostLive){
                    location.reload();
                }                
                if ('isLive' in data.payload.message && !data.payload.message.isLive){
                    location.reload();
                }
            })
            .subscribe();    
        console.log(`Subscribed to private channel: room:${_userSession.user.id}:messages`);      
        console.log("Connecting Real-time: Success!", getLocalTime());

    } catch (error) {
        console.log("Connecting Real-time: Error!", getLocalTime(), error);
    }           
  }

  function stopAnonymousRealtime(){
    gsap.set("#accept-you-host-live-flexbox", { display: 'none' });
    _sbc.removeAllChannels();
  }

  async function uploadLiveAudienceImage({ user_id, dataURL }) {
    const imageBlob = dataURLToBlob(dataURL);
    const filename = `${getLocalDate()}/${user_id}/${getLocalTimeFolder()}.png`;
    const { data, error } = await _sbc.storage
        .from('live-audience-images') // Replace with bucket name
        .upload(filename, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
    });

    if (error) throw error;

    return filename;
  }

  function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  }

  function getImage(videoEl, max_size = 320){
    const canvas = document.createElement('canvas');
    let width = videoEl.videoWidth;
    let height = videoEl.videoHeight;
    if (width > height) {
        if (width > max_size) {
            height *= max_size / width;
            width = max_size;
        }
    } else {
        if (height > max_size) {
            width *= max_size / height;
            height = max_size;
        }
    }
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(videoEl, 0, 0, width, height);
    return { dataURL: canvas.toDataURL(), width, height };      
  }  

  function getLocalDate(date = new Date()) {
    return [
        String(date.getFullYear()),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function getLocalTimeFolder(date = new Date()) {
    return [
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0'),
        String(date.getSeconds()).padStart(2, '0')
    ].join('-');
  }

  function getLocalTime(date = new Date()) {
    return [
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0'),
        String(date.getSeconds()).padStart(2, '0')
    ].join(':');
  }

  function renderTurnstile(){
    return new Promise((resolve, reject) => {
      const tokenAge = (Date.now() - _captchaTimestamp) / 1000; // in seconds
      if (tokenAge > 300 || _captchaToken == null) { // 300 seconds = 5 minutes
        // Token is expired, re-render or reset the CAPTCHA widget
        if (_captchaToken != null) 
        if (_captchaReset)
          turnstile.reset() // or however you re-render it in your setup
        else
          _captchaReset = true;
        const turnstileContainer = document.getElementById('turnstile-container');
        turnstileContainer.innerHTML = "";
        turnstile.render("#turnstile-container", {
            sitekey: "0x4AAAAAAB58hE2F_vwmF7sB",
            callback: async function (captchaToken) {
                console.log("Get Cloudflare Turnstile Captcha Token: Success!");
                _captchaTimestamp = Date.now();
                _captchaToken = captchaToken;
                resolve(captchaToken);
            },
            "error-callback": function (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
      }  else {
        resolve(_captchaToken);
      } 
    });
  }

  async function startLiveAudience(){
    return new Promise( async (resolve, reject) => {    
      const display_name = document.getElementById('text-name').value;
      const comment = document.getElementById('textarea-comment').value;
      if (display_name == '' || comment == '') {
          alert('Both inputs are required.');
          reject('Both inputs are required.');
          throw Error('Both inputs are required.');
      }
      _display_name = display_name;
      _comment = comment;

      if (_userSession == null) await loginAnonymously();

      const result = await liveAudienceAgreement();
      if (!result) throw Error("Failed Live Audience Agreement");

      let currentStream;

      // const sliderCameraBlur = document.getElementById('camera-blur');
      // sliderCameraBlur.onchange = () => {
      //   gsap.set(`#${_liveAudienceVideo.id}`, { filter: `blur(${sliderCameraBlur.value}px)`});
      // };

      // Set a timeout for 10 seconds. If something uknown happens, it will be caught here...
      // const failedCameraTimeoutId = setTimeout(function(){
      //     alert("Camera permissions should have been requested. Check browser/site settings.");
      //     reject("Camera permissions should have been requested. Check browser/site settings.");
      // }, 10000);


      // This will trigger the loadeddata event if successful.
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
          .then( function(stream) {
            const activeDeviceId = stream.getVideoTracks()[0].getSettings().deviceId;
            const selectElement = document.getElementById('camera-select');  
            navigator.mediaDevices.enumerateDevices().then(devices => {
              const cameras = devices.filter(device => device.kind === 'videoinput');
              selectElement.innerHTML = cameras.map(
                cam => `<option value="${cam.deviceId}">${cam.label || 'Camera'}</option>`
              ).join('');
            });

            // Change camera on selection
            selectElement.onchange = async () => {
              // Stop previous stream
              if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
              }
              
              // Get new camera stream
              const constraints = {
                video: { deviceId: { exact: selectElement.value } }
              };
              currentStream = await navigator.mediaDevices.getUserMedia(constraints);
              _liveAudienceVideo.srcObject = currentStream;
            };

            // clearTimeout(failedCameraTimeoutId);
            _liveAudienceVideo.srcObject = stream;
            resolve(stream);
          })
          .catch(function(error) {
              // clearTimeout(failedCameraTimeoutId);
              console.error("Camera access denied:", error);
              alert("Camera access denied.");
              reject(error);
          });
      } else {
          // clearTimeout(failedCameraTimeoutId);
          alert("Camera not supported in this browser.");
          reject("Camera not supported in this browser.");
      }
    });
  }

  function stopLiveAudience(startingYouHostLive = false){
    if (!startingYouHostLive) stopAnonymousRealtime();
    clearInterval(_updateLiveAudienceUserIntervalId);
    const stream = _liveAudienceVideo.srcObject;
    if (stream) {
        // Stop all active tracks
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());

        // Disconnect stream from the video element
        _liveAudienceVideo.srcObject = null;
    }   
  }

  async function callFunction(fnName, body){
    const { data, error } = await _sbc.functions.invoke(fnName, {
        body: body,
    });
    console.log(fnName, data, error);
    return data;
  }

  // Handling all of our errors here by alerting them
  function handleError(error) {
    if (error) {
        alert(error.message);
    }
  }
  
  function initOpenTokLayoutContainer(){
    _layoutEl = document.getElementById('layoutContainer');
        if (_layout != null) return { _layoutEl, _layout };

    _layout = initLayoutContainer(_layoutEl, {
        fixedRatio: false,
        minRatio: 9/16,
        maxRatio: 16/9,
        scaleLastRow: false,
        alignItems: 'center'
    }).layout; 
    
    // Recalculate layout when window resizes
    window.addEventListener('resize', () => _layout());
  }

  function initializeSession(applicationId, sessionId, token, e) {
    _session = OT.initSession(applicationId, sessionId);

    // Subscribe to a newly created stream
    _session.on('streamCreated', function(event) {
        const subscriber = _session.subscribe(event.stream, _layoutEl, {
            insertMode: 'append',
            width: '100%',
            height: '100%',
            fixedRatio: false
        }, handleError);
        subscriber.on('videoElementCreated', function(event) {
            if (_isModerator){
              // event.element.style.filter = _users[_youHostLiveUserId][0].filter;
              event.element.style.backgroundColor = '#00B140';
            }
        });
        _subscribers.push(subscriber);
        _layout();
    });

    _session.on('streamDestroyed', function(event) {
        event.stream.destroy();
        _layout();
        alert('Stream Destroyed.');
        location.reload();
    });

    _session.on('streamPropertyChanged', (event) => {
        if (event.changedProperty === 'videoDimensions') {
            _layout(); // reflow layout for new ratio
        }
    });

    _session.on('sessionDisconnected', (event) => {
        _subscribers.forEach(sub => sub.destroy());
        _subscribers.length = 0; // Reset array
        _layoutEl.innerHTML = ''; // manually clear your layout
        _layout();
    });

    // Create a publisher
    let options = {  
      insertMode: 'append',
        width: '100%',
        height: '100%'
    };
    if (_isClient)
      options.videoSource = document.getElementById('camera-select').value;
    
    const publisher = OT.initPublisher(_layoutEl, options, handleError);
    publisher.on('videoElementCreated', (event) => {
      if (_isClient){
        // event.element.style.filter = document.getElementById(_liveAudienceVideo.id).style.filter;
      }
    });
    _layout();

    // Connect to the session
    _session.connect(token, function(error) {
        // If the connection is successful, publish to the session
        if (error) {
            handleError(error);
        } else {
            _session.publish(publisher, handleError);
        }
    });
  }

  async function liveAudienceAgreement(){
    try {
      // const token = await renderTurnstile();
      const agreement = document.getElementById('agreement').innerHTML;
      const { data, error } = await _sbc.functions.invoke('live-audience-agreement', { body: { // await callFunction('live-audience-agreement', { 
        name: 'Functions', 
        // token,
        user_id: _userSession.user.id,
        agreement,
        app_name: _appName
       }});
      //  _captchaToken = await renderTurnstile();
      console.log('liveAudienceAgreement', data);  
      if (error) throw error;            
      return data;
    } catch (error) {
      throw new Error(error);
    }
  }

  async function signOut(){
    const { error } = await sb.auth.signOut();
    if (error) {
        console.error('SignOut Error:', error.message);
    } 
  }

  let commonPublic = {
    init, // In WebStudio HTML Embed onload
    subscribe, 
    startLiveAudience, 
    stopLiveAudience,
    startYouHostLive, 
    stopYouHostLive,
    offerYouHostLive,
    signOut
  };

  if (_isModerator){
    commonPublic.offerYouHostLive = offerYouHostLive;
    commonPublic.loginWithEmail = loginWithEmail;
  }

  return commonPublic;
})();

window.YouHostLive = YouHostLive;