const SUPABASE_URL = 'https://rbzvnsriumibdjryiwpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KWcfaZ3dAQ2ncWEvkv9dTA_Ig46rHwq';
const REDIRECT_URL = 'https://itsjha.github.io/AbhishekamBooking/';

let client = null;
let currentUser = null;
let calendar = null;

function showMessage(msg) {
  document.getElementById('message').innerText = msg;
}

async function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    showMessage('Supabase library did not load.');
    return false;
  }

  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await client.auth.getSession();
  if (error) {
    console.log(error);
    return true;
  }

  currentUser = data.session ? data.session.user : null;
  if (currentUser) {
    showMessage('Logged in as ' + currentUser.email);
  }

  return true;
}

async function login() {
  const email = document.getElementById('email').value.trim();
  const name = document.getElementById('name').value.trim();
  const flatNo = document.getElementById('flatNo').value.trim();
  
  if (!email || !name || !flatNo) {
    showMessage('Enter name, flat no, and email');
    return;
  }

  if (!client) {
    showMessage('Supabase is not ready yet. Refresh once.');
    return;
  }

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: REDIRECT_URL,
      data: {
        full_name: name,
        flat_no: flatNo
      }
    }
  });

  if (error) {
    console.log(error);
    showMessage(error.message);
  } else {
    showMessage('Login link sent to your email.');
  }
}

window.login = login;

async function loadBookings() {
  if (!client || !calendar) return;

  const { data, error } = await client
    .from('bookings')
    .select('*')
    .order('booking_date');

  if (error) {
    console.log(error);
    showMessage(error.message);
    return;
  }

  calendar.removeAllEvents();

  (data || []).forEach(item => {
    calendar.addEvent({
      title: item.booked_name + '\n Flat: ' + item.flat_no,
      start: item.booking_date,
      allDay: true
    });
  });
}

document.addEventListener('DOMContentLoaded', async function () {
  if (!window.FullCalendar) {
    showMessage('Calendar library did not load.');
    return;
  }

  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    dateClick: async function(info) {
      if (!client) {
        alert('Login system is not ready yet.');
        return;
      }

      const clickedDate = info.dateStr;

      const { data: existing, error } = await client
        .from('bookings')
        .select('*')
        .eq('booking_date', clickedDate)
        .maybeSingle();

      if (error) {
        alert(error.message);
        return;
      }

      if (existing) {
        let allowDelete = false;

        if (currentUser && currentUser.id === existing.user_id) {
          allowDelete = true;
        }

        const msg =
          'Already booked by ' +
          existing.booked_name +
          (allowDelete ? '\n\nPress OK to delete booking.' : '');

        const wantsDelete = confirm(msg);

        if (allowDelete && wantsDelete) {
          const { error: delError } = await client
            .from('bookings')
            .delete()
            .eq('id', existing.id);

          if (delError) {
            alert(delError.message);
          } else {
            alert('Booking deleted');
            loadBookings();
          }
        }
      } else {
        if (!currentUser) {
          alert('Please login first');
          return;
        }

        const confirmBooking = confirm('Book ' + clickedDate + ' ?');
        if (!confirmBooking) return;

        const flatNo = document.getElementById('flatNo').value.trim();
        const name = document.getElementById('name').value.trim();

        if (!name || !flatNo) {
          alert('Please enter name and flat no');
          return;
        }

        const { error: insertError } = await client
          .from('bookings')
          .insert({
            booking_date: clickedDate,
            user_id: currentUser.id,
            booked_name: name,
            flat_no: flatNo,
            booked_email: currentUser.email
          });

        if (insertError) {
          alert(insertError.message);
        } else {
          alert('Booking successful');
          loadBookings();
        }
      }
    }
  });

  calendar.render();
  await initSupabase();
  await loadBookings();
});
