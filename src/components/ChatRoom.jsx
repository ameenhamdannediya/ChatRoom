import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ref,
  onValue,
  push,
  set,
  remove,
  update,
} from "firebase/database";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth, db } from "../firebase";

import "./ChatRoom.css";


export default function ChatRoom() {

  const { roomId } = useParams();
  const navigate = useNavigate();


  // =========================================
  // STATE
  // =========================================

  const [messages, setMessages] = useState([]);

  const [message, setMessage] = useState("");

  const [username, setUsername] = useState("");

  const [chatName, setChatName] = useState("");

  const [uid, setUid] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [creatorKey, setCreatorKey] = useState("");

  const [isPublished, setIsPublished] = useState(false);

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");


  // =========================================
  // REFS
  // =========================================

  const messagesEndRef = useRef(null);

  const inputRef = useRef(null);


  // =========================================
  // GET CURRENT USER
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


          setUid(user.uid);


          // ===================================
          // LOAD LOCAL SESSION
          // ===================================

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
              JSON.parse(storedData);


            // =================================
            // USERNAME
            // =================================

            setUsername(
              data.username || ""
            );


            // =================================
            // ADMIN STATUS
            // =================================

            setIsAdmin(
              data.isAdmin === true
            );


            // =================================
            // CREATOR KEY
            // =================================
            //
            // The key is saved in sessionStorage
            // when the room is created or when
            // admin recovery succeeds.
            // =================================

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


          } catch (error) {

            console.error(
              "Session data error:",
              error
            );


            navigate("/ChatRoom");

          }

        }
      );


    return () => {

      unsubscribe();

    };

  }, [roomId, navigate]);


  // =========================================
  // LISTEN TO FIREBASE ROOM
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

          // =================================
          // ROOM DOESN'T EXIST
          // =================================

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
            room.chatName || "CHATROOM"
          );


          // =================================
          // ROOM TERMINATED
          // =================================

          if (room.active === false) {

            sessionStorage.removeItem(
              `chatroom_${roomId}`
            );

            navigate("/ChatRoom");

            return;
          }


          // =================================
          // CHECK ADMIN
          // =================================

          if (auth.currentUser) {

            const currentlyAdmin =
              auth.currentUser.uid ===
              room.adminUid;


            setIsAdmin(
              currentlyAdmin
            );


            // =================================
            // IF ADMIN
            // =================================
            //
            // Keep the locally stored creator
            // key.
            // =================================

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


                  if (
                    data.creatorKey
                  ) {

                    setCreatorKey(
                      data.creatorKey
                    );

                  }

                } catch (error) {

                  console.error(
                    "Creator key session error:",
                    error
                  );

                }

              }

            }

            // =================================
            // NOT ADMIN
            // =================================

            else {

              setCreatorKey("");

            }

          }


          // =================================
          // LOAD MESSAGES
          // =================================

          const messageData =
            room.messages || {};


          const messageArray =
            Object.entries(messageData)

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


        (error) => {

          console.error(
            "Firebase room error:",
            error
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

  }, [roomId, navigate]);


  // =========================================
  // LISTEN TO PUBLISH STATUS
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

        (error) => {

          console.error(
            "Public chat listener error:",
            error
          );

        }

      );


    return () => {

      unsubscribe();

    };

  }, [roomId]);


  // =========================================
  // AUTO SCROLL
  // =========================================

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages]);


  // =========================================
  // AUTO FOCUS INPUT
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

  }, [loading, sending]);


  // =========================================
  // COPY TO CLIPBOARD
  // =========================================

  async function copyToClipboard(value) {

    if (!value) {
      return;
    }


    try {

      await navigator.clipboard.writeText(
        value
      );

    } catch (error) {

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


    if (!text) {
      return;
    }


    if (
      !uid ||
      !username
    ) {

      return;

    }


    if (sending) {
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
        push(messagesRef);


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


    } catch (error) {

      console.error(
        "Send message error:",
        error
      );


      setError(
        "Message failed to send."
      );


    } finally {

      setSending(false);

    }

  }


  // =========================================
  // PUBLISH / UNPUBLISH CHAT
  // =========================================

  async function togglePublish() {

    if (!isAdmin) {
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


    } catch (error) {

      console.error(
        "Publish/unpublish error:",
        error
      );


      setError(
        "Could not update publication status."
      );


    } finally {

      setSending(false);

    }

  }


  // =========================================
  // LEAVE CHAT
  // =========================================

  function leaveChat() {

    sessionStorage.removeItem(
      `chatroom_${roomId}`
    );


    navigate("/ChatRoom");

  }


  // =========================================
  // TERMINATE SESSION
  // =========================================

  async function terminateSession() {

    if (!isAdmin) {
      return;
    }


    const confirmed =
      window.confirm(
        "TERMINATE THIS SESSION?\n\nAll messages will be permanently deleted."
      );


    if (!confirmed) {
      return;
    }


    try {

      setSending(true);

      setError("");


      const updates = {};


      updates[
        `sessions/${roomId}`
      ] = null;


      updates[
        `publicChats/${roomId}`
      ] = null;


      updates[
        `adminSecrets/${roomId}`
      ] = null;


      updates[
        `adminClaims/${roomId}`
      ] = null;


      await update(
        ref(db),
        updates
      );


      sessionStorage.removeItem(
        `chatroom_${roomId}`
      );


      navigate("/ChatRoom");


    } catch (error) {

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
  // LOADING SCREEN
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
  // CHAT ROOM
  // =========================================

  return (

    <div className="chat-terminal">


      {/* =====================================
          LEFT SIDE
      ===================================== */}

      <div className="chat-main">


        {/* ===================================
            MESSAGES
        =================================== */}

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


        {/* ===================================
            ERROR
        =================================== */}

        {error && (

          <div className="chat-error">

            &gt; ERROR: {error}

          </div>

        )}


        {/* ===================================
            MESSAGE INPUT
        =================================== */}

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
              setMessage(e.target.value)
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
          RIGHT SIDEBAR
      ===================================== */}

      <aside className="chat-sidebar">


        {/* ===================================
            SESSION
        =================================== */}

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


          {/* =================================
              CREATOR KEY
              ADMIN ONLY
          ================================= */}

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


        {/* ===================================
            USER
        =================================== */}

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


        {/* ===================================
            STATUS
        =================================== */}

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


        {/* ===================================
            CONTROLS
        =================================== */}

        <div className="sidebar-bottom">


          {/* =================================
              PUBLISH / UNPUBLISH
          ================================= */}

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


          {/* =================================
              LEAVE
          ================================= */}

          <button
            className="leave-button"
            onClick={leaveChat}
            disabled={sending}
          >

            [ LEAVE CHAT ]

          </button>


          {/* =================================
              TERMINATE
          ================================= */}

          {isAdmin && (

            <button
              className="terminate-button"
              onClick={terminateSession}
              disabled={sending}
            >

              [ TERMINATE SESSION ]

            </button>

          )}

        </div>


      </aside>


    </div>

  );

}