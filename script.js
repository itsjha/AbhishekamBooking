const SUPABASE_URL = 'https://rbzvnsriumibdjryiwpx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KWcfaZ3dAQ2ncWEvkv9dTA_Ig46rHwq';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

async function checkLogin() {

  const {
    data: { session }
  } = await client.auth.getSession();

  if (session) {
    currentUser = session.user;
    showMessage("Logged in as " + currentUser.email);
  }
}

checkLogin();

async function login() {

  const email = document.getElementById('email').value;
  const name = document.getElementById('name').value;

  if (!email || !name) {
    showMessage("Enter name and email");
    return;
  }

  const { data, error } = await client.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: 'https://yourname.github.io/booking-calendar/'
      data: {
        full_name: name
      },
    }
  });

  console.log(data);
  console.log(error);

  if (error) {
    showMessage(error.message);
  } else {
    showMessage("Magic login link sent to email");
  }
}

function showMessage(msg) {
  document.getElementById('message').innerText = msg;
}

document.addEventListener('DOMContentLoaded', async function () {

  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {

    initialView: 'dayGridMonth',

    dateClick: async function(info) {

      const clickedDate = info.dateStr;

      const { data: existing } = await client
        .from('bookings')
        .select('*')
        .eq('booking_date', clickedDate)
        .single();

      if (existing) {

        let allowDelete = false;

        if (currentUser && currentUser.id === existing.user_id) {
          allowDelete = true;
        }

        const msg =
          "Already booked by " +
          existing.booked_name +
          (allowDelete ? "\n\nPress OK to delete booking." : "");

        const wantsDelete = confirm(msg);

        if (allowDelete && wantsDelete) {

          const { error } = await client
            .from('bookings')
            .delete()
            .eq('id', existing.id);

          if (error) {
            alert(error.message);
          } else {
            alert("Booking deleted");
            loadBookings(calendar);
          }
        }

      } else {

        if (!currentUser) {
          alert("Please login first");
          return;
        }

        const confirmBooking = confirm(
          "Book " + clickedDate + " ?"
        );

        if (!confirmBooking) return;

        const { error } = await client
          .from('bookings')
          .insert({
            booking_date: clickedDate,
            user_id: currentUser.id,
            booked_name: currentUser.user_metadata.full_name || 'Guest',
            booked_email: currentUser.email
          });

        if (error) {
          alert(error.message);
        } else {
          alert("Booking successful");
          loadBookings(calendar);
        }
      }
    }

  });

  calendar.render();

  loadBookings(calendar);
});

async function loadBookings(calendar) {

  const { data, error } = await client
    .from('bookings')
    .select('*');

  if (error) {
    console.log(error);
    return;
  }

  calendar.removeAllEvents();

  data.forEach(item => {

    calendar.addEvent({
      title: 'BOOKED',
      start: item.booking_date,
      allDay: true
    });

  });
}
