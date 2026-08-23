import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ref,
  onValue,
  push,
  set,
  remove,
  update,
  get,
} from "firebase/database";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "../firebase";

import "./ChatRoom.css";


export default function ChatRoom() {

  const { roomId } = useParams();
  const navigate = useNavigate();


  // =========================================
  // STATE
  // =========================================

  const [
    messages,
    setMessages,
  ] = useState([]);


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    username,
    setUsername,
  ] = useState("");


  const [
    chatName,
    setChatName,
  ] = useState("");


  const [
    uid,
    setUid,
  ] = useState("");


  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);


  const [
    creatorKey,
    setCreatorKey,
  ] = useState("");


  const [
    isPublished,
    setIsPublished,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    sending,
    setSending,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  // =========================================
  // REFS
  // =========================================

  const messagesEndRef =
    useRef(null);

  const inputRef =
    useRef(null);


  // =========================================
  // AUTH / LOCAL SESSION
  // =========================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {

          if (!user) {

            navigate("/ChatRoom");

            return;

          }


          setUid(
            user.uid
          );


          const storedData =
            sessionStorage.getItem(
              `chatroom_${roomId}`
            );


          if (!storedData) {

            navigate("/ChatRoom");

            return;

          }


          try {

            const data =
              JSON.parse(
                storedData
              );


            setUsername(
              data.username || ""
            );


            setIsAdmin(
              data.isAdmin === true
            );


            if (
              data.isAdmin === true &&
              data.creatorKey
            ) {

              setCreatorKey(
                data.creatorKey
              );

            } else {

              setCreatorKey("");

            }

          }

          catch (error) {

            console.error(
              "Session data error:",
              error
            );


            sessionStorage.removeItem(
              `chatroom_${roomId}`
            );


            navigate("/ChatRoom");

          }

        }
      );


    return () => {

      unsubscribe();

    };

  }, [
    roomId,
    navigate,
  ]);


  // =========================================
  // FIREBASE ROOM LISTENER
  // =========================================

  useEffect(() => {

    if (!roomId) {

      return;

    }


    const roomRef =
      ref(
        db,
        `sessions/${roomId}`
      );


    const unsubscribe =
      onValue(

        roomRef,

        (snapshot) => {

          if (!snapshot.exists()) {

            sessionStorage.removeItem(
              `chatroom_${roomId}`
            );


            navigate("/ChatRoom");

            return;

          }


          const room =
            snapshot.val();


          // =================================
          // CHAT NAME
          // =================================

          setChatName(
            room.chatName ||
            "CHATROOM"
          );


          // =================================
          // TERMINATED
          // =================================

          if (
            room.active === false
          ) {

            sessionStorage.removeItem(
              `chatroom_${roomId}`
            );


            navigate("/ChatRoom");

            return;

          }


          // =================================
          // CURRENT ADMIN
          // =================================

          if (auth.currentUser) {

            const currentlyAdmin =
              auth.currentUser.uid ===
              room.adminUid;


            setIsAdmin(
              currentlyAdmin
            );


            if (currentlyAdmin) {

              const storedData =
                sessionStorage.getItem(
                  `chatroom_${roomId}`
                );


              if (storedData) {

                try {

                  const data =
                    JSON.parse(
                      storedData
                    );


                  setCreatorKey(
                    data.creatorKey || ""
                  );

                }

                catch {

                  setCreatorKey("");

                }

              }

            }

            else {

              setCreatorKey("");

            }

          }


          // =================================
          // MESSAGES
          // =================================

          const messageData =
            room.messages || {};


          const messageArray =
            Object.entries(
              messageData
            )

              .map(
                ([id, data]) => ({

                  id,

                  ...data,

                })
              )

              .sort(
                (a, b) =>
                  (a.timestamp || 0) -
                  (b.timestamp || 0)
              );


          setMessages(
            messageArray
          );


          setLoading(false);

        },

        (firebaseError) => {

          console.error(
            "Firebase room error:",
            firebaseError
          );


          setError(
            "Unable to connect to room."
          );


          setLoading(false);

        }

      );


    return () => {

      unsubscribe();

    };

  }, [
    roomId,
    navigate,
  ]);


  // =========================================
  // PUBLIC STATUS
  // =========================================

  useEffect(() => {

    if (!roomId) {

      return;

    }


    const publicChatRef =
      ref(
        db,
        `publicChats/${roomId}`
      );


    const unsubscribe =
      onValue(

        publicChatRef,

        (snapshot) => {

          setIsPublished(
            snapshot.exists()
          );

        },

        (firebaseError) => {

          console.error(
            "Public chat error:",
            firebaseError
          );

        }

      );


    return () => {

      unsubscribe();

    };

  }, [
    roomId,
  ]);


  // =========================================
  // AUTO SCROLL
  // =========================================

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [
    messages,
  ]);


  // =========================================
  // AUTO FOCUS
  // =========================================

  useEffect(() => {

    if (
      !loading &&
      !sending
    ) {

      requestAnimationFrame(() => {

        inputRef.current?.focus();

      });

    }

  }, [
    loading,
    sending,
  ]);


  // =========================================
  // COPY
  // =========================================

  async function copyToClipboard(
    value
  ) {

    if (!value) {

      return;

    }


    try {

      await navigator.clipboard.writeText(
        value
      );

    }

    catch (error) {

      console.error(
        "Clipboard error:",
        error
      );

    }

  }


  // =========================================
  // SEND MESSAGE
  // =========================================

  async function sendMessage(e) {

    e?.preventDefault();


    const text =
      message.trim();


    if (
      !text ||
      !uid ||
      !username ||
      sending
    ) {

      return;

    }


    try {

      setSending(true);

      setError("");


      const messagesRef =
        ref(
          db,
          `sessions/${roomId}/messages`
        );


      const newMessageRef =
        push(
          messagesRef
        );


      await set(

        newMessageRef,

        {

          type:
            "text",

          uid:
            uid,

          username:
            username,

          text:
            text,

          timestamp:
            Date.now(),

        }

      );


      setMessage("");

    }

    catch (error) {

      console.error(
        "Send message error:",
        error
      );


      setError(
        "Message failed to send."
      );

    }

    finally {

      setSending(false);

    }

  }


  // =========================================
  // PUBLISH / UNPUBLISH
  // =========================================

  async function togglePublish() {

    if (
      !isAdmin ||
      sending
    ) {

      return;

    }


    try {

      setSending(true);

      setError("");


      const publicChatRef =
        ref(
          db,
          `publicChats/${roomId}`
        );


      if (isPublished) {

        await remove(
          publicChatRef
        );

      }

      else {

        await set(

          publicChatRef,

          {

            roomId:
              roomId,

            chatName:
              chatName,

          }

        );

      }

    }

    catch (error) {

      console.error(
        "Publish/unpublish error:",
        error
      );


      setError(
        "Could not update publication status."
      );

    }

    finally {

      setSending(false);

    }

  }


  // =========================================
  // LEAVE CHAT
  // =========================================

  async function leaveChat() {

    const user =
      auth.currentUser;


    if (
      !user ||
      sending
    ) {

      return;

    }


    try {

      setSending(true);

      setError("");


      const roomSnapshot =
        await get(

          ref(
            db,
            `sessions/${roomId}`
          )

        );


      if (!roomSnapshot.exists()) {

        sessionStorage.removeItem(
          `chatroom_${roomId}`
        );


        navigate("/ChatRoom");

        return;

      }


      const room =
        roomSnapshot.val();


      const actuallyAdmin =
        room.adminUid ===
        user.uid;


      // =====================================
      // ADMIN LEAVING
      // =====================================

      if (actuallyAdmin) {

        await set(

          ref(
            db,
            `sessions/${roomId}/adminUid`
          ),

          ""

        );

      }


      // =====================================
      // MEMBER LEAVING
      // =====================================
      //
      // Leave locally.
      //

      sessionStorage.removeItem(
        `chatroom_${roomId}`
      );


      setIsAdmin(false);
      setCreatorKey("");


      navigate("/ChatRoom");

    }

    catch (error) {

      console.error(
        "Leave chat error:",
        error
      );


      setError(
        "Could not leave the chat."
      );


      setSending(false);

    }

  }


  // =========================================
  // TERMINATE SESSION
  // =========================================

  async function terminateSession() {

    if (
      !isAdmin ||
      sending
    ) {

      return;

    }


    const confirmed =
      window.confirm(

        "TERMINATE THIS SESSION?\n\n" +
        "All messages will be permanently deleted."

      );


    if (!confirmed) {

      return;

    }


    try {

      setSending(true);

      setError("");


      const updates = {};


      // =====================================
      // DELETE SESSION
      // =====================================

      updates[
        `sessions/${roomId}`
      ] = null;


      // =====================================
      // DELETE PUBLIC LISTING
      // =====================================

      updates[
        `publicChats/${roomId}`
      ] = null;


      // =====================================
      // DELETE CREATOR SECRET
      // =====================================

      updates[
        `adminSecrets/${roomId}`
      ] = null;


      // =====================================
      // DELETE ADMIN CLAIMS
      // =====================================

      updates[
        `adminClaims/${roomId}`
      ] = null;


      // =====================================
      // ATOMIC DELETE
      // =====================================

      await update(
        ref(db),
        updates
      );


      // =====================================
      // REMOVE LOCAL SESSION
      // =====================================

      sessionStorage.removeItem(
        `chatroom_${roomId}`
      );


      // =====================================
      // RETURN HOME
      // =====================================

      navigate("/ChatRoom");

    }

    catch (error) {

      console.error(
        "Terminate session error:",
        error
      );


      setError(
        "Could not terminate session."
      );


      setSending(false);

    }

  }


  // =========================================
  // LOADING
  // =========================================

  if (loading) {

    return (

      <div className="chat-terminal">

        <div className="terminal-loading">

          &gt; CONNECTING TO {roomId}...

          <span className="cursor">
            _
          </span>

        </div>

      </div>

    );

  }


  // =========================================
  // UI
  // =========================================

  return (

    <div className="chat-terminal">


      <div className="chat-main">


        <main className="messages-container">


          {messages.length === 0 ? (

            <div className="empty-chat">

              &gt; SESSION INITIALIZED

              <br />

              &gt; ROOM: {roomId}

              <br />

              &gt; USER: {username}

              <br />

              <br />

              &gt; NO MESSAGES

              <br />

              &gt; WAITING FOR INPUT...

            </div>

          ) : (

            messages.map((msg) => {

              const ownMessage =
                msg.uid === uid;


              return (

                <div
                  key={msg.id}
                  className={
                    ownMessage
                      ? "message own-message"
                      : "message"
                  }
                >

                  <div className="message-line">

                    <span className="message-user">
                      {msg.username}
                    </span>


                    <span className="message-arrow">
                      -&gt;
                    </span>


                    <span className="message-text">
                      {msg.text}
                    </span>


                    {ownMessage && (

                      <span className="you-tag">
                        [YOU]
                      </span>

                    )}

                  </div>

                </div>

              );

            })

          )}


          <div ref={messagesEndRef} />

        </main>


        {error && (

          <div className="chat-error">

            &gt; ERROR: {error}

          </div>

        )}


        <form
          className="chat-input-area"
          onSubmit={sendMessage}
        >

          <span className="input-prompt">
            &gt;
          </span>


          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            placeholder="TYPE MESSAGE..."
            disabled={sending}
            autoComplete="off"
            maxLength={2000}
          />


          <button
            type="submit"
            className="terminal-button"
            disabled={sending}
          >

            {sending
              ? "[...]"
              : "[SEND]"}

          </button>

        </form>

      </div>


      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside className="chat-sidebar">


        <div className="sidebar-section">


          <div className="sidebar-chat-name">
            {chatName}
          </div>


          <div className="sidebar-label">
            SESSION
          </div>


          <button
            type="button"
            className="sidebar-copy-value"
            onClick={() =>
              copyToClipboard(roomId)
            }
            title="Copy session ID"
          >
            {roomId}
          </button>


          {isAdmin && (

            <>

              <div className="sidebar-label creator-key-label">
                CREATOR KEY
              </div>


              {creatorKey ? (

                <button
                  type="button"
                  className="sidebar-copy-value creator-key-value"
                  onClick={() =>
                    copyToClipboard(
                      creatorKey
                    )
                  }
                  title="Copy creator key"
                >
                  {creatorKey}
                </button>

              ) : (

                <div className="sidebar-value">
                  KEY NOT AVAILABLE
                </div>

              )}

            </>

          )}

        </div>


        <div className="sidebar-section">


          <div className="sidebar-label">
            USER
          </div>


          <div className="sidebar-value">

            {username}{" "}

            {isAdmin && (

              <span className="admin-tag">
                [ADMIN]
              </span>

            )}

          </div>

        </div>


        <div className="sidebar-section">


          <div className="sidebar-label">
            STATUS
          </div>


          <div className="sidebar-value">

            ONLINE{" "}

            {isPublished ? (

              <span className="visibility-tag">
                [PUBLIC]
              </span>

            ) : (

              <span className="visibility-tag">
                [PRIVATE]
              </span>

            )}

          </div>

        </div>


        <div className="sidebar-bottom">


          {isAdmin && (

            <button
              className="publish-button"
              onClick={togglePublish}
              disabled={sending}
            >

              {isPublished
                ? "[ UNPUBLISH CHAT ]"
                : "[ PUBLISH CHAT ]"}

            </button>

          )}


          <button
            className="leave-button"
            onClick={leaveChat}
            disabled={sending}
          >

            {sending
              ? "[ PLEASE WAIT... ]"
              : "[ LEAVE CHAT ]"}

          </button>


          {isAdmin && (

            <button
              className="terminate-button"
              onClick={terminateSession}
              disabled={sending}
            >

              {sending
                ? "[ TERMINATING... ]"
                : "[ TERMINATE SESSION ]"}

            </button>

          )}

        </div>

      </aside>

    </div>

  );

}